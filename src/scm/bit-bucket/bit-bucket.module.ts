import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../entities/user.entity';
import { TelegramUser } from '../../entities/telegram-user.entity';
import { GitRepository } from '../../entities/git-repository.entity';
import { PullRequest } from '../../entities/pull-request.entity';
import { Review } from '../../entities/review.entity';

import { TelegramModule } from '../../telegram/telegram.module';

import { BitBucketController } from './bit-bucket.controller';

import { GitReviewersService } from '../git-reviewers/git-reviewers.service';
import { BitBucketCommandsService } from './bit-bucket-commands.service';

@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([User, TelegramUser, GitRepository, PullRequest, Review]),
        TelegramModule
    ],
    controllers: [BitBucketController],
    providers: [BitBucketCommandsService, GitReviewersService]
})
export class BitBucketModule {}
