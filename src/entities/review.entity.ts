import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DateTime } from 'luxon';

import { User } from './user.entity';
import { PullRequest } from './pull-request.entity';

import { LuxonTransformer } from '../lib/luxon-transformer';

@Entity({ name: 'reviews' })
export class Review {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'pull_request_id' })
    public pullRequestId: number;

    @Column({ name: 'user_id' })
    public userId: number;

    @Column({ name: 'state', length: 32 })
    public state: 'idle' | 'pending' | 'approved' | 'declined';

    @Column({ name: 'created_at', type: 'timestamp', transformer: new LuxonTransformer() })
    public createdAt: DateTime;

    @Column({ name: 'updated_at', type: 'timestamp', transformer: new LuxonTransformer() })
    public updatedAt: DateTime;

    /**
     * Пулл-реквест, к которому относится ревью.
     */
    @ManyToOne(() => PullRequest, (pullRequest: PullRequest) => pullRequest.reviews)
    @JoinColumn({ name: 'pull_request_id', referencedColumnName: 'id' })
    public pullRequest: PullRequest;

    /**
     * Пользователь, который ревьюит пулл-реквест.
     */
    @ManyToOne(() => User, (user: User) => user.reviews)
    @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
    public user: User;
}
