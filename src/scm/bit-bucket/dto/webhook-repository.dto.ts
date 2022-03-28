import { IsString, ValidateNested } from 'class-validator';

import { WebhookRepositoryLinksDto } from './webhook-repository-links.dto';
import { WebhookRepositoryProjectDto } from './webhook-repository-project.dto';

export class WebhookRepositoryDto {
    @IsString()
    public slug: string;

    @ValidateNested()
    public links: WebhookRepositoryLinksDto;

    @ValidateNested()
    public project: WebhookRepositoryProjectDto;
}
