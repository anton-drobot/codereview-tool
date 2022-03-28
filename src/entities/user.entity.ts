import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany, OneToOne } from 'typeorm';

import { Review } from './review.entity';
import { PullRequest } from './pull-request.entity';
import { TelegramUser } from './telegram-user.entity';

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'email', length: 64 })
    @Index({ unique: true })
    public email: string;

    /**
     * Данные Telegram-аккаунта.
     */
    @OneToOne(() => TelegramUser, (telegramUser: TelegramUser) => telegramUser.user)
    public telegramUser?: TelegramUser | null;

    /**
     * Пулл-реквесты, где пользователь — автор.
     */
    @OneToMany(() => PullRequest, (pullRequest: PullRequest) => pullRequest.author)
    public pullRequests: PullRequest[];

    /**
     * Пулл-реквесты, где пользователь — ревьюер.
     */
    @OneToMany(() => Review, (review: Review) => review.user)
    public reviews: Review[];
}
