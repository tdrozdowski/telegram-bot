import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { TelegramModule } from '../telegram/telegram.module';
import { LlmModule } from '../llm/llm.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule, TelegramModule, LlmModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
