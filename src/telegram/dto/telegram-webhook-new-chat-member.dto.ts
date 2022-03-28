import { IsString } from 'class-validator';

export class TelegramWebhookNewChatMemberDto {
    @IsString()
    public status: 'member' | 'kicked';
}
