import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DateTime } from 'luxon';

import { User } from './user.entity';
import { Review } from './review.entity';
import { GitRepository } from './git-repository.entity';

import { LuxonTransformer } from '../lib/luxon-transformer';

@Entity({ name: 'pull_requests' })
export class PullRequest {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'git_repository_id' })
    public gitRepositoryId: number;

    @Column({ name: 'pull_request_id' })
    public pullRequestId: number;

    @Column({ name: 'title', length: 2048 })
    public title: string;

    @Column({ name: 'link', length: 2048 })
    public link: string;

    @Column({ name: 'author_user_id', nullable: true })
    public authorUserId: number | null;

    @Column({ name: 'state' })
    public state: 'idle' | 'pending' | 'approved' | 'declined' | 'closed';

    @Column({ name: 'created_at', type: 'timestamp', transformer: new LuxonTransformer() })
    public createdAt: DateTime;

    @Column({ name: 'updated_at', type: 'timestamp', transformer: new LuxonTransformer() })
    public updatedAt: DateTime;

    /**
     * Репозиторий пулл-реквеста.
     */
    @ManyToOne(() => GitRepository, (repository: GitRepository) => repository.pullRequests)
    @JoinColumn({ name: 'git_repository_id', referencedColumnName: 'id' })
    public gitRepository: GitRepository;

    /**
     * Автор пулл-реквеста.
     */
    @ManyToOne(() => User, (user: User) => user.pullRequests)
    @JoinColumn({ name: 'author_user_id', referencedColumnName: 'id' })
    public author: User;

    /**
     * Ревьюеры пулл-реквеста.
     */
    @OneToMany(() => Review, (review: Review) => review.pullRequest)
    public reviews: Review[];
}
