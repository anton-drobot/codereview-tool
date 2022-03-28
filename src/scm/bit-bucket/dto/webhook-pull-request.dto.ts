import { IsNumber, IsString, ValidateNested } from 'class-validator';

import { WebhookRefDto } from './webhook-ref.dto';
import { WebhookPullRequestLinksDto } from './webhook-pull-request-links.dto';

export class WebhookPullRequestDto {
    @IsNumber()
    public id: number;

    @IsString()
    public title: string;

    @ValidateNested()
    public fromRef: WebhookRefDto;

    @ValidateNested()
    public toRef: WebhookRefDto;

    @ValidateNested()
    public links: WebhookPullRequestLinksDto;
}
