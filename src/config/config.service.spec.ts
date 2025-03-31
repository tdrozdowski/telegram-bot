import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Mock fs and yaml modules
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('js-yaml', () => ({
  load: vi.fn(),
}));

describe('ConfigService', () => {
  let service: ConfigService;

  // Sample valid configuration
  const validConfig = {
    bot: {
      token: 'test-token',
      webhook: {
        enabled: true,
        url: 'https://example.com/webhook',
        port: 8443
      },
      polling: {
        enabled: false
      }
    },
    personality: {
      name: 'TestBot',
      description: 'A test bot',
      traits: ['helpful', 'friendly'],
      tone: 'casual',
      responseStyle: 'concise'
    },
    channels: [
      {
        id: '123456',
        name: 'Test Channel',
        autoJoin: true
      }
    ],
    llm: {
      provider: 'openai',
      apiKey: 'test-api-key',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7
    },
    settings: {
      logLevel: 'info',
      allowedUsers: ['user1', 'user2'],
      blacklistedUsers: [],
      commandPrefix: '/',
      responseDelay: 0
    }
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock Logger to avoid console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set up mock implementations
    fs.readFileSync.mockReturnValue(JSON.stringify(validConfig));
    yaml.load.mockReturnValue(validConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    service = new ConfigService();
    expect(service).toBeDefined();
  });

  it('should load configuration from default path if CONFIG_PATH is not set', () => {
    delete process.env.CONFIG_PATH;
    service = new ConfigService();

    expect(fs.readFileSync).toHaveBeenCalledWith('config/bot-config.yaml', 'utf8');
    expect(yaml.load).toHaveBeenCalled();
  });

  it('should load configuration from CONFIG_PATH if set', () => {
    process.env.CONFIG_PATH = 'custom/path/config.yaml';
    service = new ConfigService();

    expect(fs.readFileSync).toHaveBeenCalledWith('custom/path/config.yaml', 'utf8');
    expect(yaml.load).toHaveBeenCalled();

    // Clean up
    delete process.env.CONFIG_PATH;
  });

  it('should throw an error if configuration loading fails', () => {
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => new ConfigService()).toThrow('File not found');
  });

  it('should throw an error if bot token is missing', () => {
    const invalidConfig = { ...validConfig, bot: { ...validConfig.bot, token: undefined } };
    vi.spyOn(yaml, 'load').mockReturnValue(invalidConfig);

    expect(() => new ConfigService()).toThrow('Bot token is required in configuration');
  });

  it('should throw an error if personality configuration is missing', () => {
    const invalidConfig = { ...validConfig, personality: undefined };
    vi.spyOn(yaml, 'load').mockReturnValue(invalidConfig);

    expect(() => new ConfigService()).toThrow('Personality configuration is required');
  });

  it('should throw an error if LLM provider or API key is missing', () => {
    const invalidConfig = { ...validConfig, llm: { ...validConfig.llm, provider: undefined } };
    vi.spyOn(yaml, 'load').mockReturnValue(invalidConfig);

    expect(() => new ConfigService()).toThrow('LLM provider and API key are required in configuration');
  });

  it('should disable polling if both webhook and polling are enabled', () => {
    const configWithBothEnabled = {
      ...validConfig,
      bot: {
        ...validConfig.bot,
        webhook: { enabled: true, url: 'https://example.com/webhook', port: 8443 },
        polling: { enabled: true }
      }
    };
    vi.spyOn(yaml, 'load').mockReturnValue(configWithBothEnabled);

    service = new ConfigService();
    const botConfig = service.getBotConfig();

    expect(botConfig.polling.enabled).toBe(false);
  });

  it('should throw an error if webhook is enabled but URL or port is missing', () => {
    const invalidConfig = {
      ...validConfig,
      bot: {
        ...validConfig.bot,
        webhook: { enabled: true, url: undefined, port: undefined }
      }
    };
    vi.spyOn(yaml, 'load').mockReturnValue(invalidConfig);

    expect(() => new ConfigService()).toThrow('Webhook URL and port are required when webhook is enabled');
  });

  it('should return the entire configuration', () => {
    service = new ConfigService();
    const config = service.getConfig();

    expect(config).toEqual(validConfig);
  });

  it('should return the bot configuration', () => {
    service = new ConfigService();
    const botConfig = service.getBotConfig();

    expect(botConfig).toEqual(validConfig.bot);
  });

  it('should return the personality configuration', () => {
    service = new ConfigService();
    const personalityConfig = service.getPersonalityConfig();

    expect(personalityConfig).toEqual(validConfig.personality);
  });

  it('should return the channels configuration', () => {
    service = new ConfigService();
    const channelsConfig = service.getChannelsConfig();

    expect(channelsConfig).toEqual(validConfig.channels);
  });

  it('should return the LLM configuration', () => {
    service = new ConfigService();
    const llmConfig = service.getLlmConfig();

    expect(llmConfig).toEqual(validConfig.llm);
  });

  it('should return the settings configuration', () => {
    service = new ConfigService();
    const settingsConfig = service.getSettingsConfig();

    expect(settingsConfig).toEqual(validConfig.settings);
  });
});
