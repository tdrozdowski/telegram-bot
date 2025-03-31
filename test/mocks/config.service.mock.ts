import { BotConfig } from '../../src/config/config.interface';
import { ConfigService } from '../../src/config/config.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockConfigService extends ConfigService {
  public mockConfig: BotConfig = {
    bot: {
      token: 'mock-token',
      webhook: {
        enabled: true,
        url: 'https://example.com/webhook',
        port: 3000,
      },
      polling: {
        enabled: false,
      },
    },
    personality: {
      name: 'TestBot',
      description: 'A bot for testing',
      traits: ['helpful', 'friendly'],
      tone: 'casual',
      responseStyle: 'concise',
    },
    channels: [
      {
        id: 'test-channel',
        name: 'Test Channel',
        autoJoin: false,
      },
    ],
    llm: {
      provider: 'openai',
      apiKey: 'mock-api-key',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7,
    },
    settings: {
      logLevel: 'info',
      allowedUsers: ['123456'],
      blacklistedUsers: ['654321'],
      commandPrefix: '/',
      responseDelay: 0,
    },
  };

  constructor() {
    super();
    // Override the config loaded by the parent constructor
    Object.defineProperty(this, 'config', {
      value: this.mockConfig,
      writable: true,
    });
  }

  override getConfig(): BotConfig {
    return this.mockConfig;
  }

  override getBotConfig(): BotConfig['bot'] {
    return this.mockConfig.bot;
  }

  override getPersonalityConfig(): BotConfig['personality'] {
    return this.mockConfig.personality;
  }

  override getChannelsConfig(): BotConfig['channels'] {
    return this.mockConfig.channels;
  }

  override getLlmConfig(): BotConfig['llm'] {
    return this.mockConfig.llm;
  }

  override getSettingsConfig(): BotConfig['settings'] {
    return this.mockConfig.settings;
  }
}
