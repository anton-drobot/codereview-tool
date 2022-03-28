import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { INotifyStartParams } from './interfaces/notify-start-params.interface';
import { INotifyPingParams } from './interfaces/notify-ping-params.interface';
import { INotifyNeedsWorkParams } from './interfaces/notify-needs-work-params.interface';
import { INotifyApprovedParams } from './interfaces/notify-approved-params.interface';
import { INotifyFixedParams } from './interfaces/notify-fixed-params.interface';
import { IBotStartParams } from './interfaces/bot-start-params.interface';

import { Review } from '../entities/review.entity';
import { TelegramUser } from '../entities/telegram-user.entity';

const plural = new Intl.PluralRules('ru-RU');

const DAYS_FORM: Record<'one' | 'few' | 'many', string> = {
    one: 'дня',
    few: 'дней',
    many: 'дней'
};

const EMOJI = {
    1: '😡',
    2: '🤬',
    3: '👿',
    4: '🤢'
};

@Injectable()
export class TelegramService {
    public constructor(
        private configService: ConfigService,
        private httpService: HttpService,
        @InjectRepository(TelegramUser)
        private readonly telegramUserRepository: Repository<TelegramUser>,
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>
    ) {}

    public async sendMessageToUser(username: string, message: string): Promise<void> {
        await this.httpService.axiosRef.post(
            `https://api.telegram.org/bot${this.configService.get<string>('TELEGRAM_BOT_TOKEN')}/sendMessage`,
            {
                chat_id: 4369863,
                text: message,
                parse_mode: 'html',
                disable_web_page_preview: true
            }
        );
    }

    public async notifyStart(params: INotifyStartParams): Promise<void> {
        const message = [
            'Требуется ревью:',
            params.pullRequestTitle,
            `<a href="${params.pullRequestLink}">${params.pullRequestLink}</a>`
        ].join('\n');

        return this.sendMessageToUser(params.username, message);
    }

    public async notifyPing(params: INotifyPingParams): Promise<void> {
        const message = ['Пулл-реквест ожидает ревью:', params.pullRequestTitle];

        if (params.daysInReview > 0) {
            message.push(
                `Ревью длится уже больше ${params.daysInReview} ${DAYS_FORM[plural.select(params.daysInReview)]}. ${
                    EMOJI[params.daysInReview] || '🤮'
                }`
            );
        }

        message.push(`<a href="${params.pullRequestLink}">${params.pullRequestLink}</a>`);

        return this.sendMessageToUser(params.username, message.join('\n'));
    }

    public async notifyNeedsWork(params: INotifyNeedsWorkParams): Promise<void> {
        const message = [
            'Пулл-реквест требует исправлений ❌:',
            params.pullRequestTitle,
            `<a href="${params.pullRequestLink}">${params.pullRequestLink}</a>`
        ].join('\n');

        return this.sendMessageToUser(params.username, message);
    }

    public async notifyApproved(params: INotifyApprovedParams): Promise<void> {
        const message = [
            'Ревью-завершено ✅:',
            params.pullRequestTitle,
            `<a href="${params.pullRequestLink}">${params.pullRequestLink}</a>`
        ].join('\n');

        return this.sendMessageToUser(params.username, message);
    }

    public async notifyFixed(params: INotifyFixedParams): Promise<void> {
        const message = [
            'Автор пулл-реквеста исправил замечания:',
            params.pullRequestTitle,
            `<a href="${params.pullRequestLink}">${params.pullRequestLink}</a>`
        ].join('\n');

        return this.sendMessageToUser(params.username, message);
    }

    public async botStart(params: IBotStartParams): Promise<void> {
        const telegramUser = await this.telegramUserRepository.findOne({ telegramUserId: params.id });

        if (typeof telegramUser === 'undefined') {
            const newTelegramUser = new TelegramUser();
            newTelegramUser.telegramUserId = params.id;
            newTelegramUser.username = params.username;

            await this.telegramUserRepository.save(newTelegramUser);
        } else {
            telegramUser.username = params.username;

            await this.telegramUserRepository.save(telegramUser);
        }
    }

    public async botStop(id: number): Promise<void> {
        const telegramUser = await this.telegramUserRepository.findOne({ telegramUserId: id });

        if (typeof telegramUser !== 'undefined') {
            await this.telegramUserRepository.remove(telegramUser);
        }
    }

    public async pending(id: number): Promise<void> {
        const telegramUser = await this.telegramUserRepository.findOne({
            where: {
                telegramUserId: id
            }
        });

        if (typeof telegramUser !== 'undefined' && telegramUser.userId !== null) {
            const reviews = await this.reviewRepository.find({
                relations: ['user', 'pullRequest'],
                where: {
                    state: 'pending',
                    user: {
                        id: telegramUser.userId
                    },
                    pullRequest: {
                        state: In(['pending', 'approved', 'declined'])
                    }
                }
            });

            if (reviews.length > 0) {
                const message = ['Ваши незавершенные ревью:'];

                reviews.forEach((review: Review) => {
                    message.push(`\n${review.pullRequest.title}`);
                    message.push(`<a href="${review.pullRequest.link}">${review.pullRequest.link}</a>`);
                });

                await this.sendMessageToUser(telegramUser.username, message.join('\n'));
            } else {
                await this.sendMessageToUser(telegramUser.username, 'Нет активных ревью');
            }
        }
    }
}
