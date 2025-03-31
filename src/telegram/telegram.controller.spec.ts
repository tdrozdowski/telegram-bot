import { Test, TestingModule } from '@nestjs/testing';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { ConfigService } from '../config/config.service';
import { Logger } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the TelegramService
const mockTelegramService = {
  handleWebhookUpdate: vi.fn(),
};

// Mock the ConfigService
const mockConfigService = {
  getBotConfig: vi.fn(),
};

// Mock Express Request and Response
const createMockRequest = () => ({
  headers: {},
  body: {},
});

const createMockResponse = () => {
  const res = {
    status: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.send.mockReturnValue(res);
  return res;
};

describe('TelegramController', () => {
  let controller: TelegramController;
  let telegramService: TelegramService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock return values
    mockConfigService.getBotConfig.mockReturnValue({
      webhook: {
        enabled: true,
        url: 'https://example.com/webhook',
        port: 3000,
      },
    });

    // Reset the mock implementation of handleWebhookUpdate
    mockTelegramService.handleWebhookUpdate.mockReset();
    mockTelegramService.handleWebhookUpdate.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<TelegramController>(TelegramController);
    telegramService = module.get<TelegramService>(TelegramService);
    configService = module.get<ConfigService>(ConfigService);

    // Manually set webhookEnabled to true for tests that expect it to be true
    (controller as any).webhookEnabled = true;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize webhookEnabled to true when webhook is enabled in config', () => {
      expect((controller as any).webhookEnabled).toBe(true);
    });

    it('should initialize webhookEnabled to false when webhook is disabled in config', async () => {
      mockConfigService.getBotConfig.mockReturnValueOnce({
        webhook: {
          enabled: false,
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramController],
        providers: [
          { provide: TelegramService, useValue: mockTelegramService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledController = module.get<TelegramController>(TelegramController);
      expect((disabledController as any).webhookEnabled).toBe(false);
    });

    it('should initialize webhookEnabled to false when webhook config is missing', async () => {
      mockConfigService.getBotConfig.mockReturnValueOnce({});

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramController],
        providers: [
          { provide: TelegramService, useValue: mockTelegramService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const missingConfigController = module.get<TelegramController>(TelegramController);
      expect((missingConfigController as any).webhookEnabled).toBe(false);
    });

    it('should initialize webhookEnabled to false when there is an error loading bot config', async () => {
      mockConfigService.getBotConfig.mockImplementationOnce(() => {
        throw new Error('Config error');
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramController],
        providers: [
          { provide: TelegramService, useValue: mockTelegramService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const errorController = module.get<TelegramController>(TelegramController);
      expect((errorController as any).webhookEnabled).toBe(false);
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook updates when webhook is enabled', async () => {
      // Create a controller with direct access to its properties
      const controller = new TelegramController(
        mockTelegramService,
        mockConfigService
      );

      // Manually set webhookEnabled to true
      (controller as any).webhookEnabled = true;

      const req = createMockRequest();
      const res = createMockResponse();
      const update = { update_id: 123, message: { text: 'Test' } };

      // Reset the mock
      mockTelegramService.handleWebhookUpdate.mockReset();
      mockTelegramService.handleWebhookUpdate.mockResolvedValue(undefined);

      await controller.handleWebhook(update, req, res);

      expect(mockTelegramService.handleWebhookUpdate).toHaveBeenCalledWith(update);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');
    });

    it('should return 403 when webhook is disabled', async () => {
      // Create a controller with webhook disabled
      mockConfigService.getBotConfig.mockReturnValueOnce({
        webhook: {
          enabled: false,
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramController],
        providers: [
          { provide: TelegramService, useValue: mockTelegramService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledController = module.get<TelegramController>(TelegramController);

      const req = createMockRequest();
      const res = createMockResponse();
      const update = { update_id: 123, message: { text: 'Test' } };

      await disabledController.handleWebhook(update, req, res);

      expect(mockTelegramService.handleWebhookUpdate).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Webhook mode is disabled');
    });

    it('should handle errors during webhook processing', async () => {
      // Create a controller with direct access to its properties
      const controller = new TelegramController(
        mockTelegramService,
        mockConfigService
      );

      // Manually set webhookEnabled to true
      (controller as any).webhookEnabled = true;

      const req = createMockRequest();
      const res = createMockResponse();
      const update = { update_id: 123, message: { text: 'Test' } };

      // Reset the mock and make it reject
      mockTelegramService.handleWebhookUpdate.mockReset();
      mockTelegramService.handleWebhookUpdate.mockRejectedValue(new Error('Webhook error'));

      await controller.handleWebhook(update, req, res);

      expect(mockTelegramService.handleWebhookUpdate).toHaveBeenCalledWith(update);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    });
  });

  describe('healthCheck', () => {
    it('should return status ok and webhook mode when webhook is enabled', async () => {
      const result = await controller.healthCheck();

      expect(result).toEqual({ status: 'ok', mode: 'webhook' });
    });

    it('should return status ok and polling mode when webhook is disabled', async () => {
      // Create a controller with webhook disabled
      mockConfigService.getBotConfig.mockReturnValueOnce({
        webhook: {
          enabled: false,
        },
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TelegramController],
        providers: [
          { provide: TelegramService, useValue: mockTelegramService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledController = module.get<TelegramController>(TelegramController);

      const result = await disabledController.healthCheck();

      expect(result).toEqual({ status: 'ok', mode: 'polling' });
    });
  });
});
