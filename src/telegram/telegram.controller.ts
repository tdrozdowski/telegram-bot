import { Controller, Post, Body, Logger, Req, Res } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigService } from '../config/config.service';
import { Request, Response } from 'express';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  private readonly webhookEnabled: boolean;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {
    // Default to webhook disabled
    this.webhookEnabled = false;

    // Try to get webhook config if configService is available
    try {
      if (this.configService && typeof this.configService.getBotConfig === 'function') {
        const botConfig = this.configService.getBotConfig();
        if (botConfig && botConfig.webhook) {
          this.webhookEnabled = botConfig.webhook.enabled || false;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load bot config from config service: ${error.message}`);
    }
  }

  /**
   * Handle webhook updates from Telegram
   * This endpoint will be called by Telegram when a new update is available
   */
  @Post('webhook')
  async handleWebhook(
    @Body() update: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.webhookEnabled) {
      this.logger.warn('Received webhook request but webhook mode is disabled');
      return res.status(403).send('Webhook mode is disabled');
    }

    try {
      // Verify the request is from Telegram (optional, can be enhanced with secret token)
      // Process the update
      await this.telegramService.handleWebhookUpdate(update);
      return res.status(200).send('OK');
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`);
      return res.status(500).send('Internal Server Error');
    }
  }

  /**
   * Health check endpoint
   */
  @Post('health')
  async healthCheck() {
    return { status: 'ok', mode: this.webhookEnabled ? 'webhook' : 'polling' };
  }
}
