import { ValidateNested } from 'class-validator';

import { WebhookLinkDto } from './webhook-link.dto';

export class WebhookRepositoryLinksDto {
    @ValidateNested()
    public clone: WebhookLinkDto[];
}
