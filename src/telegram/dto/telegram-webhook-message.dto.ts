import { IsString, ValidateNested } from 'class-validator';

import { TelegramWebhookChatDto } from './telegram-webhook-chat.dto';

export class TelegramWebhookMessageDto {
    @ValidateNested()
    public chat: TelegramWebhookChatDto;

    @IsString()
    public text: string;
}
