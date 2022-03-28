import { Body, Controller, Headers, Post } from '@nestjs/common';

import { WebhookDto } from './dto/webhook.dto';
import { WebhookUserDto } from './dto/webhook-user.dto';
import { WebhookLinkDto } from './dto/webhook-link.dto';

import { BitBucketCommandsService } from './bit-bucket-commands.service';

@Controller('api/scm/bitbucket')
export class BitBucketController {
    public constructor(private commandsService: BitBucketCommandsService) {}

    @Post('webhook')
    public async webhook(@Headers('X-Event-Key') eventKey: string, @Body() webhookDto: WebhookDto): Promise<string> {
        if (eventKey === 'diagnostics:ping') {
            return 'ok';
        }

        const project = webhookDto.pullRequest.toRef.repository.project.key;
        const repository = webhookDto.pullRequest.toRef.repository.slug;
        const fromLink = webhookDto.pullRequest.fromRef.repository.links.clone.find(
            (link: WebhookLinkDto) => link.name === 'ssh'
        )!.href;
        const toLink = webhookDto.pullRequest.toRef.repository.links.clone.find(
            (link: WebhookLinkDto) => link.name === 'ssh'
        )!.href;
        const pullRequestAuthor = webhookDto.actor.emailAddress;
        const pullRequestBranch = webhookDto.pullRequest.fromRef.displayId;
        const pullRequestId = webhookDto.pullRequest.id;
        const pullRequestTitle = webhookDto.pullRequest.title;
        const pullRequestLink = webhookDto.pullRequest.links.self[0].href;
        const addedReviewers = webhookDto.addedReviewers;
        const removedReviewers = webhookDto.removedReviewers;

        if (eventKey === 'pr:opened') {
            await this.commandsService.create({
                fromLink,
                toLink,
                project,
                repository,
                pullRequestId,
                pullRequestAuthor,
                pullRequestBranch,
                pullRequestTitle,
                pullRequestLink
            });
        } else if (eventKey === 'pr:declined' || eventKey === 'pr:deleted' || eventKey === 'pr:merged') {
            await this.commandsService.close({
                project,
                repository,
                pullRequestId
            });
        } else if (eventKey === 'pr:modified') {
            await this.commandsService.modified({
                project,
                repository,
                pullRequestId,
                pullRequestTitle
            });
        } else if (eventKey === 'pr:reviewer:updated') {
            const promises = [];

            promises.push(
                addedReviewers.map(async (reviewer: WebhookUserDto) =>
                    this.commandsService.add({
                        project,
                        repository,
                        pullRequestId,
                        email: reviewer.emailAddress
                    })
                )
            );

            promises.push(
                removedReviewers.map(async (reviewer: WebhookUserDto) =>
                    this.commandsService.remove({
                        project,
                        repository,
                        pullRequestId,
                        email: reviewer.emailAddress
                    })
                )
            );

            await Promise.all(promises);
        } else if (eventKey === 'pr:reviewer:needs_work') {
            await this.commandsService.declined({
                project,
                repository,
                pullRequestId,
                email: webhookDto.participant.user.emailAddress
            });
        } else if (eventKey === 'pr:reviewer:approved') {
            await this.commandsService.approved({
                project,
                repository,
                pullRequestId,
                email: webhookDto.participant.user.emailAddress
            });
        } else if (eventKey === 'pr:comment:added') {
            const command = webhookDto.comment.text.trim().toLowerCase();

            if (command === '/assign') {
                await this.commandsService.assign({
                    fromLink,
                    toLink,
                    project,
                    repository,
                    pullRequestId,
                    pullRequestAuthor,
                    pullRequestBranch
                });
            } else if (command === '/start') {
                await this.commandsService.start({
                    project,
                    repository,
                    pullRequestId
                });
            } else if (command === '/stop') {
                await this.commandsService.stop({
                    project,
                    repository,
                    pullRequestId
                });
            } else if (command === '/restart') {
                await this.commandsService.restart({
                    project,
                    repository,
                    pullRequestId
                });
            } else if (command === '/ping') {
                await this.commandsService.ping({
                    project,
                    repository,
                    pullRequestId
                });
            } else if (command === '/fixed') {
                await this.commandsService.fixed({
                    project,
                    repository,
                    pullRequestId
                });
            }
        }

        return 'ok';
    }
}
