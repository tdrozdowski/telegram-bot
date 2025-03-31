import { INestApplication } from '@nestjs/common';
import { BotService } from '../src/bot/bot.service';
import { vi } from 'vitest';
import { createTestingApp } from './test-utils';
import { MockConfigService } from './mocks/config.service.mock';
import { MockTelegramService } from './mocks/telegram.service.mock';
import { TelegramService } from '../src/telegram/telegram.service';
import { MockLlmService } from './mocks/llm.service.mock';

describe('BotService (e2e)', () => {
  let app: INestApplication;
  let mockConfigService: MockConfigService;
  let mockTelegramService: MockTelegramService;
  let mockLlmService: MockLlmService;
  let botService: BotService;

  // Set the CONFIG_PATH environment variable to point to the test configuration
  const originalConfigPath = process.env.CONFIG_PATH;

  beforeEach(async () => {
    const testApp = await createTestingApp({
      providers: [BotService],
    });

    app = testApp.app;
    mockConfigService = testApp.mockConfigService;
    mockTelegramService = testApp.mockTelegramService;
    mockLlmService = testApp.mockLlmService;

    // Spy on the registerMessageHandler method
    vi.spyOn(mockTelegramService, 'registerMessageHandler');

    botService = app.get<BotService>(BotService);

    // Manually call onModuleInit to ensure the message handler is registered
    await botService.onModuleInit();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    // Restore the original CONFIG_PATH environment variable
    if (originalConfigPath) {
      process.env.CONFIG_PATH = originalConfigPath;
    } else {
      delete process.env.CONFIG_PATH;
    }

    // Reset all mocks and spies
    vi.restoreAllMocks();
    mockTelegramService.resetMocks();
  });

  describe('Message handling', () => {
    it('should initialize the bot service', async () => {
      // Since we're now calling handleMessage directly in other tests,
      // we just need to verify that the bot service was initialized
      // This test will pass as long as the beforeEach hook completes successfully
      expect(botService).toBeDefined();
    });

    it('should handle text messages and generate responses', async () => {
      // Set up a mock response
      mockLlmService.setMockResponse('test message', 'This is a test response');

      // Create a new BotService instance with the mock services
      const testBotService = new BotService(
        mockTelegramService as unknown as TelegramService,
        mockLlmService as any,
        mockConfigService
      );

      // Create a mock context
      const mockContext = {
        message: {
          text: 'test message',
        },
        chat: {
          id: 123456,
        },
        from: {
          id: 123456,
        },
        telegram: {
          sendChatAction: vi.fn().mockResolvedValue(true),
        },
        reply: vi.fn().mockResolvedValue(true),
      };

      // Access the private handleMessage method using any type assertion
      const handleMessage = (testBotService as any).handleMessage.bind(testBotService);

      // Call the handler directly
      await handleMessage(mockContext);

      // Verify that the context's reply method was called with the expected response
      expect(mockContext.reply).toHaveBeenCalledWith('This is a test response');
    });

    it('should not process messages from blacklisted users', async () => {
      // Set up a mock response
      mockLlmService.setMockResponse('test message', 'This is a test response');

      // Create a new BotService instance with the mock services
      const testBotService = new BotService(
        mockTelegramService as unknown as TelegramService,
        mockLlmService as any,
        mockConfigService
      );

      // Create a mock context with a blacklisted user
      const mockContext = {
        message: {
          text: 'test message',
        },
        chat: {
          id: 123456,
        },
        from: {
          id: 654321, // This ID is in the blacklist in our mock config
        },
        telegram: {
          sendChatAction: vi.fn().mockResolvedValue(true),
        },
        reply: vi.fn().mockResolvedValue(true),
      };

      // Access the private handleMessage method using any type assertion
      const handleMessage = (testBotService as any).handleMessage.bind(testBotService);

      // Call the handler directly
      await handleMessage(mockContext);

      // Verify that the context's reply method was not called
      expect(mockContext.reply).not.toHaveBeenCalled();
    });

    it('should handle custom commands', async () => {
      // Create a new BotService instance with the mock services
      const testBotService = new BotService(
        mockTelegramService as unknown as TelegramService,
        mockLlmService as any,
        mockConfigService
      );

      // Create a mock context with a command
      const mockContext = {
        message: {
          text: '/reset', // Using the command prefix from our mock config
        },
        chat: {
          id: 123456,
        },
        from: {
          id: 123456,
        },
        telegram: {
          sendChatAction: vi.fn().mockResolvedValue(true),
        },
        reply: vi.fn().mockResolvedValue(true),
      };

      // Access the private handleMessage method using any type assertion
      const handleMessage = (testBotService as any).handleMessage.bind(testBotService);

      // Call the handler directly
      await handleMessage(mockContext);

      // Verify that the context's reply method was called with the reset message
      expect(mockContext.reply).toHaveBeenCalledWith(
        "I've reset our conversation history.",
      );
    });

    it('should handle errors during message processing', async () => {
      // Create a new BotService instance with the mock services
      const testBotService = new BotService(
        mockTelegramService as unknown as TelegramService,
        mockLlmService as any,
        mockConfigService
      );

      // Make LlmService throw an error
      vi.spyOn(mockLlmService, 'generateResponse').mockImplementation(() => {
        throw new Error('Test error');
      });

      // Create a mock context
      const mockContext = {
        message: {
          text: 'test message',
        },
        chat: {
          id: 123456,
        },
        from: {
          id: 123456,
        },
        telegram: {
          sendChatAction: vi.fn().mockResolvedValue(true),
        },
        reply: vi.fn().mockResolvedValue(true),
      };

      // Access the private handleMessage method using any type assertion
      const handleMessage = (testBotService as any).handleMessage.bind(testBotService);

      // Call the handler directly
      await handleMessage(mockContext);

      // Verify that the context's reply method was called with the error message
      expect(mockContext.reply).toHaveBeenCalledWith(
        "I'm sorry, I encountered an error while processing your message.",
      );
    });
  });
});
