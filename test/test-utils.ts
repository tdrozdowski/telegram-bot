import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '../src/config/config.service';
import { MockConfigService } from './mocks/config.service.mock';
import { TelegramService } from '../src/telegram/telegram.service';
import { MockTelegramService } from './mocks/telegram.service.mock';
import { LlmService } from '../src/llm/llm.service';
import { MockLlmService } from './mocks/llm.service.mock';


export async function createTestingApp(options: {
  controllers?: any[];
  providers?: any[];
  customMockConfigService?: MockConfigService;
  customMockTelegramService?: MockTelegramService;
  customMockLlmService?: MockLlmService;
}): Promise<{
  app: INestApplication;
  mockConfigService: MockConfigService;
  mockTelegramService: MockTelegramService;
  mockLlmService: MockLlmService;
}> {
  const mockConfigService = options.customMockConfigService || new MockConfigService();
  const mockTelegramService = options.customMockTelegramService || new MockTelegramService();
  const mockLlmService = options.customMockLlmService || new MockLlmService();

  // Set the CONFIG_PATH environment variable to point to the test configuration
  process.env.CONFIG_PATH = 'test/bot-config.test.yaml';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [],
    controllers: options.controllers || [],
    providers: [
      ...(options.providers || []),
      {
        provide: ConfigService,
        useValue: mockConfigService,
      },
      { provide: TelegramService, useValue: mockTelegramService },
      { provide: LlmService, useValue: mockLlmService },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    mockConfigService,
    mockTelegramService,
    mockLlmService,
  };
}
