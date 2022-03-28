import { IsString } from 'class-validator';

export class WebhookRepositoryProjectDto {
    @IsString()
    public key: string;
}
