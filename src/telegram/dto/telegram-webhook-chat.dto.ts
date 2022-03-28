import { IsNumber, IsString } from 'class-validator';

export class TelegramWebhookChatDto {
    @IsNumber()
    public id: number;

    @IsString()
    public username: string;

    @IsString()
    public type: 'private';
}
