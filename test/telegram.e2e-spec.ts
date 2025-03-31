import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TelegramController } from '../src/telegram/telegram.controller';
import { vi } from 'vitest';
import { createTestingApp } from './test-utils';
import { MockConfigService } from './mocks/config.service.mock';
import { MockTelegramService } from './mocks/telegram.service.mock';

// Helper function to create a test app with webhook enabled or disabled
async function createTelegramTestApp(webhookEnabled: boolean) {
  // Create a standard MockConfigService
  const customMockConfigService = new MockConfigService();

  // Create the test app with the standard controller
  const testApp = await createTestingApp({
    controllers: [TelegramController],
    providers: [],
    customMockConfigService,
  });

  // Get the TelegramController instance
  const controller = testApp.app.get(TelegramController);

  // Override the webhookEnabled property directly
  Object.defineProperty(controller, 'webhookEnabled', {
    value: webhookEnabled,
    writable: true,
  });

  return testApp;
}

describe('TelegramController (e2e)', () => {
  let app: INestApplication;
  let mockConfigService: MockConfigService;
  let mockTelegramService: MockTelegramService;

  // Set the CONFIG_PATH environment variable to point to the test configuration
  const originalConfigPath = process.env.CONFIG_PATH;

  // We'll create the app in each test with the appropriate webhook setting

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

  describe('/telegram/webhook (POST)', () => {
    it('should return 403 when webhook is disabled', async () => {
      // Create a test app with webhook disabled
      const testApp = await createTelegramTestApp(false);
      app = testApp.app;
      mockConfigService = testApp.mockConfigService;
      mockTelegramService = testApp.mockTelegramService;

      return request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({ message: { text: 'test message' } })
        .expect(403)
        .expect('Webhook mode is disabled');
    });

    it('should process webhook update when webhook is enabled', async () => {
      // Create a test app with webhook enabled
      const testApp = await createTelegramTestApp(true);
      app = testApp.app;
      mockConfigService = testApp.mockConfigService;
      mockTelegramService = testApp.mockTelegramService;

      // Get the TelegramController instance
      const controller = app.get(TelegramController);

      // Manually set the telegramService to ensure it's defined
      Object.defineProperty(controller, 'telegramService', {
        value: mockTelegramService,
        writable: true,
      });

      // Spy on the handleWebhookUpdate method
      const handleWebhookUpdateSpy = vi.spyOn(
        mockTelegramService,
        'handleWebhookUpdate',
      );

      return request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({ message: { text: 'test message' } })
        .expect(200)
        .expect('OK')
        .then(() => {
          // Verify that handleWebhookUpdate was called with the update
          expect(handleWebhookUpdateSpy).toHaveBeenCalledWith({
            message: { text: 'test message' },
          });
        });
    });

    it('should handle errors during webhook processing', async () => {
      // Create a test app with webhook enabled
      const testApp = await createTelegramTestApp(true);
      app = testApp.app;
      mockConfigService = testApp.mockConfigService;
      mockTelegramService = testApp.mockTelegramService;

      // Get the TelegramController instance
      const controller = app.get(TelegramController);

      // Manually set the telegramService to ensure it's defined
      Object.defineProperty(controller, 'telegramService', {
        value: mockTelegramService,
        writable: true,
      });

      // Make handleWebhookUpdate throw an error
      vi.spyOn(mockTelegramService, 'handleWebhookUpdate').mockImplementation(
        () => {
          throw new Error('Test error');
        },
      );

      return request(app.getHttpServer())
        .post('/telegram/webhook')
        .send({ message: { text: 'test message' } })
        .expect(500)
        .expect('Internal Server Error');
    });
  });

  describe('/telegram/health (POST)', () => {
    it('should return health status with webhook mode', async () => {
      // Create a test app with webhook enabled
      const testApp = await createTelegramTestApp(true);
      app = testApp.app;
      mockConfigService = testApp.mockConfigService;
      mockTelegramService = testApp.mockTelegramService;

      return request(app.getHttpServer())
        .post('/telegram/health')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'ok', mode: 'webhook' });
        });
    });

    it('should return health status with polling mode', async () => {
      // Create a test app with webhook disabled
      const testApp = await createTelegramTestApp(false);
      app = testApp.app;
      mockConfigService = testApp.mockConfigService;
      mockTelegramService = testApp.mockTelegramService;

      return request(app.getHttpServer())
        .post('/telegram/health')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'ok', mode: 'polling' });
        });
    });
  });
});
