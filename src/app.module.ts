import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { TelegramUser } from './entities/telegram-user.entity';
import { GitRepository } from './entities/git-repository.entity';
import { PullRequest } from './entities/pull-request.entity';
import { Review } from './entities/review.entity';

import { HealthChecksModule } from './health-checks/health-checks.module';
import { TelegramModule } from './telegram/telegram.module';
import { ScmModule } from './scm/scm.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get('DB_USERNAME'),
                password: configService.get('DB_PASSWORD'),
                database: configService.get('DB_DATABASE'),
                entities: [User, TelegramUser, GitRepository, PullRequest, Review],
                synchronize: false
            }),
            inject: [ConfigService]
        }),
        ScheduleModule.forRoot(),
        HealthChecksModule,
        TelegramModule,
        ScmModule
    ]
})
export class AppModule {}
