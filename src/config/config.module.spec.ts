import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from './config.module';
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

describe('ConfigModule', () => {
  let module: TestingModule;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset all mocks
    vi.resetAllMocks();

    // Set up mock implementations
    const mockConfig = {
      bot: {
        token: 'test-token',
        webhook: {
          enabled: true,
          url: 'https://example.com/webhook',
          port: 8443
        }
      },
      personality: {
        name: 'TestBot'
      },
      llm: {
        provider: 'openai',
        apiKey: 'test-api-key'
      }
    };

    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
    yaml.load.mockReturnValue(mockConfig);

    // Mock Logger to avoid console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide ConfigService', () => {
    expect(configService).toBeDefined();
    expect(configService).toBeInstanceOf(ConfigService);
  });

  it('should have ConfigService with loaded configuration', () => {
    expect(configService.getBotConfig()).toBeDefined();
    expect(configService.getBotConfig().token).toBe('test-token');
  });
});
