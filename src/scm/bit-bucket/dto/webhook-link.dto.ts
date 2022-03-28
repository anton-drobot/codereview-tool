import { IsString } from 'class-validator';

export class WebhookLinkDto {
    @IsString()
    public href: string;

    @IsString()
    public name?: string;
}
