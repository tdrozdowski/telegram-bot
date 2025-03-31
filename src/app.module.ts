import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { TelegramModule } from './telegram/telegram.module';
import { LlmModule } from './llm/llm.module';
import { BotModule } from './bot/bot.module';
import { TelegramController } from './telegram/telegram.controller';

@Module({
  imports: [ConfigModule, TelegramModule, LlmModule, BotModule],
  controllers: [TelegramController],
  providers: [],
})
export class AppModule {}
