import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

import { User } from './user.entity';

@Entity({ name: 'telegram_users' })
export class TelegramUser {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'username', length: 32 })
    public username: string;

    @Column({ name: 'telegram_user_id', nullable: true })
    public telegramUserId: number | null;

    @Column({ name: 'user_id', nullable: true })
    public userId: number | null;

    /**
     * Пользователь для этого телеграм-аккаунта.
     */
    @OneToOne(() => User, (user: User) => user.telegramUser)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    public user?: User | null;
}
