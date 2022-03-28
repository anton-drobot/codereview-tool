import { ValidateNested } from 'class-validator';

import { WebhookLinkDto } from './webhook-link.dto';

export class WebhookPullRequestLinksDto {
    @ValidateNested()
    public self: WebhookLinkDto[];
}
