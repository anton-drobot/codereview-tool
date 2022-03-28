import { Body, Controller, Post } from '@nestjs/common';

import { TelegramWebhookDto } from './dto/telegram-webhook.dto';

import { TelegramService } from './telegram.service';

@Controller('api/telegram')
export class TelegramController {
    public constructor(private telegramService: TelegramService) {}

    @Post('webhook')
    public async webhook(@Body() body: TelegramWebhookDto): Promise<string> {
        if (typeof body.my_chat_member !== 'undefined' && body.my_chat_member.chat.type === 'private') {
            if (body.my_chat_member.new_chat_member.status === 'member') {
                await this.telegramService.botStart({
                    id: body.my_chat_member.chat.id,
                    username: body.my_chat_member.chat.username
                });
            } else if (body.my_chat_member.new_chat_member.status === 'kicked') {
                await this.telegramService.botStop(body.my_chat_member.chat.id);
            }
        } else if (typeof body.message !== 'undefined' && body.message.chat.type === 'private') {
            const text = body.message.text.trim().toLowerCase();

            if (text === '/pending') {
                await this.telegramService.pending(body.message.chat.id);
            }
        }

        return 'ok';
    }
}
