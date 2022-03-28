import { ValidateNested } from 'class-validator';

import { TelegramWebhookChatDto } from './telegram-webhook-chat.dto';
import { TelegramWebhookNewChatMemberDto } from './telegram-webhook-new-chat-member.dto';

export class TelegramWebhookMyChatMemberDto {
    @ValidateNested()
    public chat: TelegramWebhookChatDto;

    @ValidateNested()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public new_chat_member: TelegramWebhookNewChatMemberDto;
}
