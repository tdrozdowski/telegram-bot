import { Context, Telegraf } from 'telegraf';
import { vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { BotConfig } from '../../src/config/config.interface';

export class MockTelegramService {
  private readonly logger = new Logger(MockTelegramService.name);
  private bot: Telegraf;
  private botConfig: BotConfig['bot'];
  private personalityConfig: BotConfig['personality'];
  private messageHandlers: Array<(ctx: Context) => Promise<void>> = [];

  constructor() {
    // Initialize mock bot
    this.bot = {
      telegram: {
        setWebhook: vi.fn().mockResolvedValue(true),
        sendMessage: vi.fn().mockResolvedValue(true),
      },
      launch: vi.fn().mockResolvedValue(true),
      stop: vi.fn().mockResolvedValue(true),
      handleUpdate: vi.fn().mockResolvedValue(true),
    } as unknown as Telegraf;

    // Initialize bot config
    this.botConfig = this.getBotConfig();

    // Initialize personality config
    this.personalityConfig = this.getPersonalityConfig();
  }

  async onModuleInit() {
    // Mock implementation
  }

  async onModuleDestroy() {
    // Mock implementation
  }

  registerMessageHandler(handler: (ctx: Context) => Promise<void>) {
    this.messageHandlers.push(handler);
    return this;
  }

  getBot(): Telegraf {
    return this.bot;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    this.bot.telegram.sendMessage(chatId, text);
  }

  async handleWebhookUpdate(update: any): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  // Helper method for testing
  async triggerMessageHandler(ctx: Context): Promise<void> {
    for (const handler of this.messageHandlers) {
      await handler(ctx);
    }
  }

  // Reset mocks for testing
  resetMocks() {
    // Don't clear messageHandlers array, so registered handlers persist between tests
    // this.messageHandlers = [];

    // Just clear the mock function call history
    (this.bot.telegram.setWebhook as any).mockClear();
    (this.bot.telegram.sendMessage as any).mockClear();
    (this.bot.launch as any).mockClear();
    (this.bot.stop as any).mockClear();
    (this.bot.handleUpdate as any).mockClear();
  }

  // Mock method to return bot config
  getBotConfig() {
    return {
      token: 'mock-token',
      webhook: {
        enabled: true,
        url: 'https://example.com/webhook',
        port: 3000,
      },
      polling: {
        enabled: false,
      },
    };
  }

  // Mock method to return personality config
  getPersonalityConfig() {
    return {
      name: 'MockBot',
      description: 'A mock bot for testing',
      traits: ['helpful', 'friendly', 'mock'],
      tone: 'casual',
      responseStyle: 'concise',
    };
  }
}
