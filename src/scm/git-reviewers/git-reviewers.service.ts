import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

import { Injectable } from '@nestjs/common';
import { isObject } from 'lodash';
import { select } from 'weighted';

import { IGetReviewersParams } from './interfaces/get-reviewers-params.interface';
import { IReviewer } from './interfaces/reviewer.interface';
import { IAuthorWithCommits } from './interfaces/author-with-commits.interface';
import { ICodeReviewConfig } from './interfaces/code-review-config.interface';
import { ICodeReviewConfigAllowedUser } from './interfaces/code-review-config-allowed-user.interface';

import { normalizeEmail } from '../../lib/normalize-email';

const ALLOWED_NOTIFICATIONS: Array<ICodeReviewConfig['notification']> = ['telegram'];

@Injectable()
export class GitReviewersService {
    public makeCodeReviewConfigByContent(content: string): ICodeReviewConfig {
        const config: ICodeReviewConfig = {
            allowedUsers: [],
            reviewersCount: 1,
            approveCount: 1,
            autoAssign: true,
            notification: 'telegram'
        };

        try {
            const json = JSON.parse(content);
            const jsonAllowedUsers = json.allowed_users;
            const jsonReviewersCount = json.reviewers_count;
            const jsonApproveCount = json.approve_count;
            const jsonAutoAssign = json.auto_assign;
            const jsonNotification = json.notification;

            if (Array.isArray(jsonAllowedUsers)) {
                config.allowedUsers = jsonAllowedUsers
                    .filter(this.isValueCodeReviewConfigAllowedUser)
                    .map((allowedUser: ICodeReviewConfigAllowedUser) => ({
                        email: normalizeEmail(allowedUser.email),
                        telegram: allowedUser.telegram
                    }));
            }

            if (typeof jsonReviewersCount === 'number' && jsonReviewersCount > 0) {
                config.reviewersCount = jsonReviewersCount;
            }

            if (typeof jsonApproveCount === 'number' && jsonApproveCount > 0) {
                config.approveCount = jsonApproveCount;
            }

            if (typeof jsonAutoAssign === 'boolean') {
                config.autoAssign = jsonAutoAssign;
            }

            if (this.isAllowedNotification(jsonNotification)) {
                config.notification = jsonNotification;
            }

            return config;
        } catch (error) {
            return config;
        }
    }

    public getReviewers(params: IGetReviewersParams, config: ICodeReviewConfig): string[] {
        const { directory, baseBranch, pullRequestAuthor, pullRequestBranch } = params;
        const gitDirectory = path.join(directory, '.git');
        const changedFiles = this.getChangedFiles(gitDirectory, pullRequestBranch, baseBranch);
        const authorsOfFiles = this.getAuthorsOfFiles(gitDirectory, changedFiles);
        const allowedReviewersForFiles = this.getAllowedReviewersForFiles(
            config.allowedUsers,
            authorsOfFiles,
            pullRequestAuthor
        );

        return this.getRandomReviewers(allowedReviewersForFiles, config.reviewersCount);
    }

    protected isValueCodeReviewConfigAllowedUser(value: any): value is ICodeReviewConfigAllowedUser {
        if (!isObject(value)) {
            return false;
        }

        if (!('email' in value)) {
            return false;
        }

        // @ts-ignore тайпскрипт считает `value.telegram` некорректным
        if ('telegram' in value && typeof value.telegram !== 'string') {
            return false;
        }

        return true;
    }

    protected isAllowedNotification(value: any): value is ICodeReviewConfig['notification'] {
        return typeof value === 'string' && ALLOWED_NOTIFICATIONS.includes(value as ICodeReviewConfig['notification']);
    }

    protected getChangedFiles(gitDirectory: string, pullRequestBranch: string, baseBranch: string): string[] {
        const sha1 = spawnSync(
            'git',
            ['--git-dir', gitDirectory, 'merge-base', `origin/${pullRequestBranch}`, `upstream/${baseBranch}`],
            { encoding: 'utf-8' }
        ).stdout.trim();

        return spawnSync(
            'git',
            ['--git-dir', gitDirectory, 'diff', sha1, `origin/${pullRequestBranch}`, '--name-only'],
            { encoding: 'utf-8' }
        )
            .stdout.trim()
            .split('\n');

        // todo: показывать статистику изменений в пулл-реквестах
        // если вместо --name-only поставить --shortstat, то получим статистику для пулл-реквеста
        // например, 25 files changed, 985 insertions(+), 222 deletions(-)
    }

    protected getAuthorsOfFiles(gitDirectory: string, changedFiles: string[]): IAuthorWithCommits[] {
        const commandArgs = ['--git-dir', gitDirectory, 'shortlog', 'HEAD', '-sne'];

        // если список файлов не пустой, то применяем алгоритм к этим файлам
        if (changedFiles.length > 0) {
            commandArgs.push('--');
            commandArgs.push(...changedFiles);
        }

        const result = spawnSync('git', commandArgs, { encoding: 'utf-8' }).stdout;

        return result
            .split('\n')
            .filter((line: string) => line.trim() !== '')
            .map((line: string) => line.match(/\s(\d+)\s(.+)\s<(.*@.*)>/))
            .filter((match: RegExpMatchArray | null) => match !== null)
            .map<IAuthorWithCommits>((match: RegExpMatchArray) => ({
                commits: Number(match[1]),
                author: match[3].trim().toLowerCase()
            }))
            .reduce<IAuthorWithCommits[]>((acc: IAuthorWithCommits[], data: IAuthorWithCommits) => {
                const index = acc.findIndex((x: IAuthorWithCommits) => x.author === data.author);

                if (index !== -1) {
                    acc[index].commits += data.commits;

                    return acc;
                }

                return [...acc, data];
            }, []);
    }

    protected getAllowedReviewersForFiles(
        allowedUser: ICodeReviewConfigAllowedUser[],
        authorsOfFiles: IAuthorWithCommits[],
        pullRequestAuthor: string
    ): IReviewer[] {
        return allowedUser.reduce<IReviewer[]>((acc: IReviewer[], reviewer: ICodeReviewConfigAllowedUser) => {
            const email = normalizeEmail(reviewer.email);

            if (email === normalizeEmail(pullRequestAuthor)) {
                return acc;
            }

            const foundAuthor = authorsOfFiles.find(
                (authorOfFiles: IAuthorWithCommits) => normalizeEmail(authorOfFiles.author) === email
            );

            return [
                ...acc,
                {
                    email,
                    weight: typeof foundAuthor !== 'undefined' ? foundAuthor.commits : 1
                }
            ];
        }, []);
    }

    protected getRandomReviewers(reviewers: IReviewer[], reviewersCount: number): string[] {
        const max = Math.min(reviewersCount, reviewers.length);
        let restReviewers = [...reviewers];
        const result: string[] = [];

        for (let i = 0; i < max; i++) {
            const items = restReviewers.map((reviewer: IReviewer) => reviewer.email);
            const weights = restReviewers.map((reviewer: IReviewer) => reviewer.weight);
            const email = normalizeEmail(select(items, weights));

            result.push(email);
            restReviewers = restReviewers.filter((reviewer: IReviewer) => normalizeEmail(reviewer.email) !== email);
        }

        return result;
    }
}
