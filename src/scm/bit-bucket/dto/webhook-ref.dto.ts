import { IsString, ValidateNested } from 'class-validator';

import { WebhookRepositoryDto } from './webhook-repository.dto';

export class WebhookRefDto {
    @IsString()
    public displayId: string;

    @ValidateNested()
    public repository: WebhookRepositoryDto;
}
