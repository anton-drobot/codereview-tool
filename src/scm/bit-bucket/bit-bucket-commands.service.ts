import * as fs from 'fs';
import { setTimeout } from 'timers/promises';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';

import { ICreateCommandParams } from './interfaces/create-command-params.interface';
import { ICloseCommandParams } from './interfaces/close-command-params.interface';
import { IModifiedCommandParams } from './interfaces/modified-command-params.interface';
import { IAssignCommandParams } from './interfaces/assign-command-params.interface';
import { IAddCommandParams } from './interfaces/add-command-params.interface';
import { IRemoveCommandParams } from './interfaces/remove-command-params.interface';
import { IStartCommandParams } from './interfaces/start-command-params.interface';
import { IStopCommandParams } from './interfaces/stop-command-params.interface';
import { IRestartCommandParams } from './interfaces/restart-command-params.interface';
import { IPingCommandParams } from './interfaces/ping-command-params.interface';
import { IFixedCommandParams } from './interfaces/fixed-command-params.interface';
import { IDeclinedCommandParams } from './interfaces/declined-command-params.interface';
import { IApprovedCommandParams } from './interfaces/approved-command-params.interface';
import { ICodeReviewConfig } from '../git-reviewers/interfaces/code-review-config.interface';
import { ICodeReviewConfigAllowedUser } from '../git-reviewers/interfaces/code-review-config-allowed-user.interface';

import { User } from '../../entities/user.entity';
import { TelegramUser } from '../../entities/telegram-user.entity';
import { GitRepository } from '../../entities/git-repository.entity';
import { PullRequest } from '../../entities/pull-request.entity';
import { Review } from '../../entities/review.entity';

import { TelegramService } from '../../telegram/telegram.service';
import { GitReviewersService } from '../git-reviewers/git-reviewers.service';

import { gitCloneWithRemote } from '../../lib/git-clone-with-remote';
import { getUsernameFromEmail } from '../../lib/get-username-from-email';
import { normalizeEmail } from '../../lib/normalize-email';

@Injectable()
export class BitBucketCommandsService {
    public constructor(
        private configService: ConfigService,
        private httpService: HttpService,
        private telegramService: TelegramService,
        private gitReviewersService: GitReviewersService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(TelegramUser)
        private readonly telegramUserRepository: Repository<TelegramUser>,
        @InjectRepository(GitRepository)
        private readonly gitRepositoryRepository: Repository<GitRepository>,
        @InjectRepository(PullRequest)
        private readonly pullRequestRepository: Repository<PullRequest>,
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>
    ) {}

    /**
     * Создание пулл-реквеста.
     */
    public async create(params: ICreateCommandParams): Promise<void> {
        const {
            fromLink,
            toLink,
            project,
            repository,
            pullRequestId,
            pullRequestAuthor,
            pullRequestBranch,
            pullRequestTitle,
            pullRequestLink,
            reviewers
        } = params;

        const gitRepository = await this.getOrCreateRepository(project, repository);
        const user = await this.getOrCreateUserByEmail(pullRequestAuthor);
        const pullRequest = await this.getOrCreatePullRequest(
            gitRepository,
            user,
            pullRequestId,
            pullRequestTitle,
            pullRequestLink
        );

        if (pullRequest.state !== 'idle') {
            pullRequest.title = pullRequestTitle;
            pullRequest.state = 'idle';
            pullRequest.updatedAt = DateTime.now();

            await this.pullRequestRepository.save(pullRequest);
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        if (reviewers.length > 0) {
            const users = await Promise.all(reviewers.map(async (email: string) => this.getOrCreateUserByEmail(email)));
            await this.addReviewers(pullRequest, users);
        } else if (codeReviewConfig.autoAssign) {
            await this.assign({
                fromLink,
                toLink,
                project,
                repository,
                pullRequestId,
                pullRequestAuthor,
                pullRequestBranch
            });
        }
    }

    public async close(params: ICloseCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        pullRequest.state = 'closed';
        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);
    }

    public async modified(params: IModifiedCommandParams): Promise<void> {
        const { project, repository, pullRequestId, pullRequestTitle } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        const isDeclined = pullRequest.reviews.some((review: Review) => review.state === 'declined');
        const isApproved =
            pullRequest.reviews.filter((review: Review) => review.state === 'approved').length >=
            codeReviewConfig.approveCount;

        if (isDeclined) {
            pullRequest.state = 'declined';
        } else if (isApproved) {
            pullRequest.state = 'approved';
        } else {
            pullRequest.state = 'pending';
        }

        if (pullRequest.title !== pullRequestTitle) {
            pullRequest.title = pullRequestTitle;
            pullRequest.updatedAt = DateTime.now();
            await this.pullRequestRepository.save(pullRequest);
        }
    }

    public async assign(params: IAssignCommandParams): Promise<void> {
        const { fromLink, toLink, project, repository, pullRequestId, pullRequestAuthor, pullRequestBranch } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state !== 'idle') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        if (pullRequest.reviews.length > 0) {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Ревьюеры уже назначены.'
            );

            return;
        }

        const [defaultBranchName, codeReviewConfig] = await Promise.all([
            this.getDefaultBranchName(gitRepository.project, gitRepository.repository),
            this.getCodeReviewConfig(gitRepository.project, gitRepository.repository)
        ]);

        gitCloneWithRemote({
            fromLink,
            toLink,
            baseBranch: defaultBranchName,
            pullRequestBranch
        })
            .then(async (directory: string) => {
                const reviewersEmail = this.gitReviewersService.getReviewers(
                    {
                        directory,
                        baseBranch: defaultBranchName,
                        pullRequestAuthor,
                        pullRequestBranch
                    },
                    codeReviewConfig
                );
                const users = await this.getUsers(codeReviewConfig.allowedUsers);
                const reviewers = users.filter((user: User) => reviewersEmail.includes(normalizeEmail(user.email)));

                await Promise.all(
                    reviewers.map(async (user: User) => {
                        await this.addReviewerToPullRequest(
                            pullRequest.gitRepository.project,
                            pullRequest.gitRepository.repository,
                            pullRequest.pullRequestId,
                            user
                        );
                    })
                );

                return fs.promises.rm(directory, { recursive: true, force: true });
            })
            .catch((error: Error) => {
                this.addCommentToPullRequest(
                    gitRepository.project,
                    gitRepository.repository,
                    pullRequest.pullRequestId,
                    `Случилась ошибка:\n\`\`\`\n${error.stack || error.toString()}\n\`\`\``
                );
            });
    }

    public async add(params: IAddCommandParams): Promise<void> {
        const { project, repository, pullRequestId, email } = params;
        const user = await this.getOrCreateUserByEmail(email);
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        await this.addReviewers(pullRequest, [user]);

        if (pullRequest.state === 'pending') {
            const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

            if (codeReviewConfig.notification === 'telegram' && user.telegramUser) {
                await this.telegramService.notifyStart({
                    pullRequestTitle: pullRequest.title,
                    pullRequestLink: pullRequest.link,
                    username: user.telegramUser.username
                });
            }
        }
    }

    public async remove(params: IRemoveCommandParams): Promise<void> {
        const { project, repository, pullRequestId, email } = params;
        const user = await this.getOrCreateUserByEmail(email);
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        await this.removeReviewers(pullRequest, [user]);
    }

    public async start(params: IStartCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state !== 'idle') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        const isDeclined = pullRequest.reviews.some((review: Review) => review.state === 'declined');
        const isApproved =
            pullRequest.reviews.filter((review: Review) => review.state === 'approved').length >=
            codeReviewConfig.approveCount;

        if (isDeclined) {
            pullRequest.state = 'declined';
        } else if (isApproved) {
            pullRequest.state = 'approved';
        } else {
            pullRequest.state = 'pending';
        }

        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);

        await Promise.all(
            pullRequest.reviews.map(async (review: Review) => {
                if (review.state === 'idle') {
                    review.state = 'pending';
                    review.updatedAt = DateTime.now();

                    await this.reviewRepository.save(review);

                    if (codeReviewConfig.notification === 'telegram' && review.user.telegramUser) {
                        await this.telegramService.notifyStart({
                            pullRequestTitle: pullRequest.title,
                            pullRequestLink: pullRequest.link,
                            username: review.user.telegramUser.username
                        });
                    }
                }
            })
        );
    }

    public async stop(params: IStopCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        pullRequest.state = 'idle';
        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);

        await Promise.all(
            pullRequest.reviews.map(async (review: Review) => {
                if (review.state === 'pending') {
                    review.state = 'idle';
                    review.updatedAt = DateTime.now();

                    await this.reviewRepository.save(review);
                }
            })
        );
    }

    public async restart(params: IRestartCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        pullRequest.state = 'pending';
        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        const users = pullRequest.reviews.map((review: Review) => review.user);

        // Битбакет не умеет ставить статус ревью за другого пользователя,
        // поэтому делаем хак: сначала удаляем ревьюеров, потом снова их добавляем

        await Promise.all(
            users.map(async (user: User) => {
                await this.removeReviewerFromPullRequest(
                    pullRequest.gitRepository.project,
                    pullRequest.gitRepository.repository,
                    pullRequest.pullRequestId,
                    user
                );
            })
        );

        await setTimeout(15 * 1000);

        await Promise.all(
            users.map(async (user: User) => {
                await this.addReviewerToPullRequest(
                    pullRequest.gitRepository.project,
                    pullRequest.gitRepository.repository,
                    pullRequest.pullRequestId,
                    user
                );

                if (codeReviewConfig.notification === 'telegram' && user.telegramUser) {
                    await this.telegramService.notifyStart({
                        pullRequestTitle: pullRequest.title,
                        pullRequestLink: pullRequest.link,
                        username: user.telegramUser.username
                    });
                }
            })
        );
    }

    public async ping(params: IPingCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        await Promise.all(
            pullRequest.reviews.map(async (review: Review) => {
                if (review.state === 'pending') {
                    if (codeReviewConfig.notification === 'telegram' && review.user.telegramUser) {
                        await this.telegramService.notifyPing({
                            pullRequestTitle: pullRequest.title,
                            pullRequestLink: pullRequest.link,
                            username: review.user.telegramUser.username,
                            daysInReview: Math.floor(DateTime.now().diff(review.updatedAt, 'days').days)
                        });
                    }
                }
            })
        );
    }

    public async fixed(params: IFixedCommandParams): Promise<void> {
        const { project, repository, pullRequestId } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        pullRequest.state = 'pending';
        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);

        await Promise.all(
            pullRequest.reviews.map(async (review: Review) => {
                if (codeReviewConfig.notification === 'telegram' && review.user.telegramUser) {
                    await this.telegramService.notifyFixed({
                        pullRequestTitle: pullRequest.title,
                        pullRequestLink: pullRequest.link,
                        username: review.user.telegramUser.username
                    });
                }
            })
        );
    }

    public async declined(params: IDeclinedCommandParams): Promise<void> {
        const { project, repository, pullRequestId, email } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        const review = pullRequest.reviews.find((x: Review) => normalizeEmail(x.user.email) === normalizeEmail(email));

        if (typeof review !== 'undefined') {
            review.state = 'declined';
            review.updatedAt = DateTime.now();
            await this.reviewRepository.save(review);
        }

        pullRequest.state = 'declined';
        pullRequest.updatedAt = DateTime.now();
        await this.pullRequestRepository.save(pullRequest);

        if (codeReviewConfig.notification === 'telegram' && pullRequest.author.telegramUser) {
            await this.telegramService.notifyNeedsWork({
                pullRequestTitle: pullRequest.title,
                pullRequestLink: pullRequest.link,
                username: pullRequest.author.telegramUser.username
            });
        }
    }

    public async approved(params: IApprovedCommandParams): Promise<void> {
        const { project, repository, pullRequestId, email } = params;
        const gitRepository = await this.getRepository(project, repository);

        if (typeof gitRepository === 'undefined') {
            await this.addCommentToPullRequest(
                project,
                repository,
                pullRequestId,
                'Репозиторий не зарегистрирован в системе.'
            );

            return;
        }

        const pullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof pullRequest === 'undefined') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequestId,
                'Пулл-реквест не зарегистрирован в системе.'
            );

            return;
        }

        if (pullRequest.state === 'idle' || pullRequest.state === 'closed') {
            await this.addCommentToPullRequest(
                gitRepository.project,
                gitRepository.repository,
                pullRequest.pullRequestId,
                'Невозможно провести изменения в ревью, потому что пулл-реквест в некорректном статусе.'
            );

            return;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);

        const review = pullRequest.reviews.find((x: Review) => normalizeEmail(x.user.email) === normalizeEmail(email));

        if (typeof review !== 'undefined') {
            review.state = 'approved';
            review.updatedAt = DateTime.now();
            await this.reviewRepository.save(review);
        }

        const approves = pullRequest.reviews.filter((x: Review) => x.state === 'approved').length;

        if (
            codeReviewConfig.approveCount >= approves &&
            codeReviewConfig.notification === 'telegram' &&
            pullRequest.author.telegramUser
        ) {
            pullRequest.state = 'approved';
            pullRequest.updatedAt = DateTime.now();
            await this.pullRequestRepository.save(pullRequest);

            await this.telegramService.notifyApproved({
                pullRequestTitle: pullRequest.title,
                pullRequestLink: pullRequest.link,
                username: pullRequest.author.telegramUser.username
            });
        }
    }

    protected async getOrCreateUserByEmail(email: string): Promise<User> {
        const normalizedEmail = normalizeEmail(email);

        const existedUser = this.userRepository.findOne({ email: normalizedEmail });

        if (typeof existedUser !== 'undefined') {
            return existedUser;
        }

        const user = new User();
        user.email = normalizedEmail;

        return this.userRepository.save(user);
    }

    protected async getRepository(project: string, repository: string): Promise<GitRepository | undefined> {
        return this.gitRepositoryRepository.findOne({
            relations: [
                'pullRequests',
                'pullRequests.gitRepository',
                'pullRequests.reviews',
                'pullRequests.reviews.user',
                'pullRequests.reviews.user.telegramUser',
                'pullRequests.author',
                'pullRequests.author.telegramUser'
            ],
            where: {
                type: 'bitbucket',
                project,
                repository
            }
        });
    }

    protected async getOrCreateRepository(project: string, repository: string): Promise<GitRepository> {
        const existedGitRepository = await this.getRepository(project, repository);

        if (typeof existedGitRepository !== 'undefined') {
            return existedGitRepository;
        }

        const codeReviewConfig = await this.getCodeReviewConfig(project, repository);
        await this.getUsers(codeReviewConfig.allowedUsers);

        const gitRepository = new GitRepository();
        gitRepository.type = 'bitbucket';
        gitRepository.project = project;
        gitRepository.repository = repository;
        gitRepository.pullRequests = [];

        return this.gitRepositoryRepository.save(gitRepository);
    }

    protected getPullRequest(gitRepository: GitRepository, pullRequestId: number): PullRequest | undefined {
        return gitRepository.pullRequests.find(
            (pullRequest: PullRequest) => pullRequest.pullRequestId === pullRequestId
        );
    }

    protected async getOrCreatePullRequest(
        gitRepository: GitRepository,
        author: User,
        pullRequestId: number,
        pullRequestTitle: string,
        pullRequestLink: string
    ): Promise<PullRequest> {
        const existedPullRequest = this.getPullRequest(gitRepository, pullRequestId);

        if (typeof existedPullRequest !== 'undefined') {
            return existedPullRequest;
        }

        const now = DateTime.now();
        const pullRequest = new PullRequest();
        pullRequest.author = author;
        pullRequest.pullRequestId = pullRequestId;
        pullRequest.title = pullRequestTitle;
        pullRequest.link = pullRequestLink;
        pullRequest.state = 'idle';
        pullRequest.createdAt = now;
        pullRequest.updatedAt = now;
        pullRequest.gitRepository = gitRepository;
        pullRequest.reviews = [];

        return this.pullRequestRepository.save(pullRequest);
    }

    protected async getDefaultBranchName(project: string, repository: string): Promise<string> {
        const response = await this.httpService.axiosRef.get(
            `${this.configService.get<string>(
                'BITBUCKET_BASE_URL'
            )}/rest/api/1.0/projects/${project}/repos/${repository}/branches/default`,
            {
                auth: {
                    username: this.configService.get<string>('BITBUCKET_USERNAME'),
                    password: this.configService.get<string>('BITBUCKET_PASSWORD')
                }
            }
        );

        return response.data.displayId;
    }

    protected async getCodeReviewConfig(project: string, repository: string): Promise<ICodeReviewConfig> {
        const response = await this.httpService.axiosRef.get(
            `${this.configService.get<string>(
                'BITBUCKET_BASE_URL'
            )}/rest/api/1.0/projects/${project}/repos/${repository}/raw/.codereview.json`,
            {
                auth: {
                    username: this.configService.get<string>('BITBUCKET_USERNAME'),
                    password: this.configService.get<string>('BITBUCKET_PASSWORD')
                },
                responseType: 'text',
                transitional: {
                    forcedJSONParsing: false
                }
            }
        );

        return this.gitReviewersService.makeCodeReviewConfigByContent(response.data);
    }

    protected async getUsers(allowedUsers: ICodeReviewConfigAllowedUser[]): Promise<User[]> {
        const users = await this.getOrCreateUsers(allowedUsers);

        return this.linkTelegramUsers(users, allowedUsers);
    }

    protected async getOrCreateUsers(allowedUsers: ICodeReviewConfigAllowedUser[]): Promise<User[]> {
        const existedUsers = await this.userRepository.find({
            relations: ['telegramUser'],
            where: allowedUsers.map((user: ICodeReviewConfigAllowedUser) => ({ email: normalizeEmail(user.email) }))
        });

        const usersToAdd = allowedUsers
            .filter(
                (allowedUser: ICodeReviewConfigAllowedUser) =>
                    typeof existedUsers.find(
                        (user: User) => normalizeEmail(user.email) === normalizeEmail(allowedUser.email)
                    ) === 'undefined'
            )
            .map((allowedUser: ICodeReviewConfigAllowedUser) => allowedUser.email);

        const addedUsers = await Promise.all(
            usersToAdd.map(async (email: string) => {
                const user = new User();
                user.email = normalizeEmail(email);

                return this.userRepository.save(user);
            })
        );

        return [...existedUsers, ...addedUsers];
    }

    protected async linkTelegramUsers(users: User[], allowedUsers: ICodeReviewConfigAllowedUser[]): Promise<User[]> {
        const existedTelegramUsers = await this.telegramUserRepository.find({
            where: allowedUsers.reduce((acc: Array<{ username: string }>, user: ICodeReviewConfigAllowedUser) => {
                if (typeof user.telegram !== 'undefined') {
                    return [
                        ...acc,
                        {
                            username: user.telegram
                        }
                    ];
                }

                return acc;
            }, [])
        });

        for await (const user of users) {
            const allowedUser = allowedUsers.find(
                (x: ICodeReviewConfigAllowedUser) => normalizeEmail(x.email) === normalizeEmail(user.email)
            );

            if (typeof allowedUser !== 'undefined') {
                // Если изменился username в телеграме
                if (
                    user.telegramUser !== null &&
                    typeof user.telegramUser !== 'undefined' &&
                    user.telegramUser.username !== allowedUser.telegram
                ) {
                    user.telegramUser.username = allowedUser.telegram;

                    await this.telegramUserRepository.save(user.telegramUser);
                }

                // Если телеграма еще не существует или он не привязан
                if (user.telegramUser === null || typeof user.telegramUser === 'undefined') {
                    const existedTelegramUser = existedTelegramUsers.find(
                        (x: TelegramUser) => x.username === allowedUser.telegram
                    );

                    if (typeof existedTelegramUser !== 'undefined') {
                        user.telegramUser = existedTelegramUser;
                    } else {
                        const telegramUser = new TelegramUser();
                        telegramUser.username = allowedUser.telegram;

                        await this.telegramUserRepository.save(telegramUser);

                        user.telegramUser = telegramUser;
                    }

                    await this.userRepository.save(user);
                }
            }
        }

        return users;
    }

    protected async addCommentToPullRequest(
        project: string,
        repository: string,
        pullRequestId: number,
        message: string
    ): Promise<void> {
        await this.httpService.axiosRef.post(
            `${this.configService.get<string>(
                'BITBUCKET_BASE_URL'
            )}/rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestId}/comments`,
            {
                text: message
            },
            {
                auth: {
                    username: this.configService.get<string>('BITBUCKET_USERNAME'),
                    password: this.configService.get<string>('BITBUCKET_PASSWORD')
                }
            }
        );
    }

    protected async addReviewerToPullRequest(
        project: string,
        repository: string,
        pullRequestId: number,
        user: User
    ): Promise<void> {
        await this.httpService.axiosRef.post(
            `${this.configService.get<string>(
                'BITBUCKET_BASE_URL'
            )}/rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestId}/participants`,
            {
                user: {
                    name: getUsernameFromEmail(normalizeEmail(user.email))
                },
                role: 'REVIEWER'
            },
            {
                auth: {
                    username: this.configService.get<string>('BITBUCKET_USERNAME'),
                    password: this.configService.get<string>('BITBUCKET_PASSWORD')
                }
            }
        );
    }

    protected async removeReviewerFromPullRequest(
        project: string,
        repository: string,
        pullRequestId: number,
        user: User
    ): Promise<void> {
        await this.httpService.axiosRef.delete(
            `${this.configService.get<string>(
                'BITBUCKET_BASE_URL'
            )}/rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestId}/participants/${getUsernameFromEmail(
                normalizeEmail(user.email)
            )}`,
            {
                auth: {
                    username: this.configService.get<string>('BITBUCKET_USERNAME'),
                    password: this.configService.get<string>('BITBUCKET_PASSWORD')
                }
            }
        );
    }

    protected async addReviewers(pullRequest: PullRequest, users: User[]): Promise<void> {
        await Promise.all(
            users.map(async (user: User) => {
                if (
                    typeof pullRequest.reviews.find(
                        (x: Review) => normalizeEmail(x.user.email) === normalizeEmail(user.email)
                    ) !== 'undefined'
                ) {
                    await this.addCommentToPullRequest(
                        pullRequest.gitRepository.project,
                        pullRequest.gitRepository.repository,
                        pullRequest.pullRequestId,
                        `Пользователь @"${getUsernameFromEmail(normalizeEmail(user.email))}" уже добавлен ревьюером.`
                    );
                } else {
                    const now = DateTime.now();
                    const newReview = new Review();
                    newReview.state = pullRequest.state === 'idle' ? 'idle' : 'pending';
                    newReview.createdAt = now;
                    newReview.updatedAt = now;
                    newReview.user = user;
                    newReview.pullRequest = pullRequest;
                    await this.reviewRepository.save(newReview);
                }
            })
        );
    }

    protected async removeReviewers(pullRequest: PullRequest, users: User[]): Promise<void> {
        await Promise.all(
            users.map(async (user: User) => {
                const review = pullRequest.reviews.find(
                    (x: Review) => normalizeEmail(x.user.email) === normalizeEmail(user.email)
                );

                if (typeof review === 'undefined') {
                    await this.addCommentToPullRequest(
                        pullRequest.gitRepository.project,
                        pullRequest.gitRepository.repository,
                        pullRequest.pullRequestId,
                        `Пользователь @"${getUsernameFromEmail(user.email)}" не является ревьюером.`
                    );
                } else {
                    await this.reviewRepository.remove(review);
                }
            })
        );
    }

    @Cron('0 30 11 * * 1-5')
    public async handleCron(): Promise<void> {
        const reviews = await this.reviewRepository.find({
            relations: ['pullRequest', 'pullRequest.gitRepository', 'user', 'user.telegramUser'],
            where: {
                state: 'pending',
                pullRequest: {
                    state: 'pending',
                    gitRepository: {
                        type: 'bitbucket'
                    }
                }
            }
        });

        const configsCache = {};

        await Promise.all(
            reviews.map(async (review: Review) => {
                const { gitRepository } = review.pullRequest;
                const cacheKey = `${gitRepository.project}-${gitRepository.repository}`;
                let codeReviewConfig;

                if (typeof configsCache[cacheKey] !== 'undefined') {
                    codeReviewConfig = configsCache[cacheKey];
                } else {
                    codeReviewConfig = await this.getCodeReviewConfig(gitRepository.project, gitRepository.repository);
                    configsCache[cacheKey] = codeReviewConfig;
                }

                if (codeReviewConfig.notification === 'telegram' && review.user.telegramUser) {
                    await this.telegramService.notifyPing({
                        pullRequestTitle: review.pullRequest.title,
                        pullRequestLink: review.pullRequest.link,
                        username: review.user.telegramUser.username,
                        daysInReview: Math.floor(DateTime.now().diff(review.updatedAt, 'days').days)
                    });
                }
            })
        );
    }
}
