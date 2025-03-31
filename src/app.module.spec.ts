import { describe, it, expect } from 'vitest';
import { AppModule } from './app.module';
import { ConfigModule } from './config/config.module';
import { TelegramModule } from './telegram/telegram.module';
import { LlmModule } from './llm/llm.module';
import { BotModule } from './bot/bot.module';
import { TelegramController } from './telegram/telegram.controller';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });

  it('should import ConfigModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(ConfigModule);
  });

  it('should import TelegramModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(TelegramModule);
  });

  it('should import LlmModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(LlmModule);
  });

  it('should import BotModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(BotModule);
  });

  it('should have TelegramController', () => {
    const controllers = Reflect.getMetadata('controllers', AppModule);
    expect(controllers).toContain(TelegramController);
  });
});
