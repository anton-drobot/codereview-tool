import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Review } from '../entities/review.entity';
import { TelegramUser } from '../entities/telegram-user.entity';

import { TelegramController } from './telegram.controller';

import { TelegramService } from './telegram.service';

@Module({
    imports: [TypeOrmModule.forFeature([TelegramUser, Review]), HttpModule],
    controllers: [TelegramController],
    providers: [TelegramService],
    exports: [TelegramService]
})
export class TelegramModule {}
