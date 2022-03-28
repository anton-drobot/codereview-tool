import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

import { PullRequest } from './pull-request.entity';

@Entity({ name: 'git_repositories' })
export class GitRepository {
    @PrimaryGeneratedColumn({ name: 'id' })
    public id: number;

    @Column({ name: 'type', length: 32 })
    public type: 'bitbucket';

    @Column({ name: 'project', length: 64 })
    public project: string;

    @Column({ name: 'repository', length: 64 })
    public repository: string;

    /**
     * Пулл-реквесты, которые были открыты для этого репозитория.
     */
    @OneToMany(() => PullRequest, (pullRequest: PullRequest) => pullRequest.gitRepository)
    public pullRequests: PullRequest[];
}
