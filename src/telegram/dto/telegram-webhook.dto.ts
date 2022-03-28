import { ValidateNested } from 'class-validator';

import { TelegramWebhookMessageDto } from './telegram-webhook-message.dto';
import { TelegramWebhookMyChatMemberDto } from './telegram-webhook-my-chat-member.dto';

export class TelegramWebhookDto {
    @ValidateNested()
    public message: TelegramWebhookMessageDto;

    @ValidateNested()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public my_chat_member: TelegramWebhookMyChatMemberDto;
}
