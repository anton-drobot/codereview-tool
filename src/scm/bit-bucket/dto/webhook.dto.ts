import { ValidateNested } from 'class-validator';

import { WebhookUserDto } from './webhook-user.dto';
import { WebhookCommentDto } from './webhook-comment.dto';
import { WebhookParticipantDto } from './webhook-participant.dto';
import { WebhookPullRequestDto } from './webhook-pull-request.dto';

export class WebhookDto {
    @ValidateNested()
    public actor: WebhookUserDto;

    @ValidateNested()
    public pullRequest: WebhookPullRequestDto;

    @ValidateNested()
    public addedReviewers: WebhookUserDto[];

    @ValidateNested()
    public removedReviewers: WebhookUserDto[];

    @ValidateNested()
    public participant: WebhookParticipantDto;

    @ValidateNested()
    public comment: WebhookCommentDto;
}
