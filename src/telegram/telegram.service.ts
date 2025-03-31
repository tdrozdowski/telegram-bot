import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { ConfigService } from '../config/config.service';
import { BotConfig } from '../config/config.interface';
import { message } from 'telegraf/filters';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private botConfig: BotConfig['bot'];
  private personalityConfig: BotConfig['personality'];
  private messageHandlers: Array<(ctx: Context) => Promise<void>> = [];

  constructor(private readonly configService: ConfigService) {
    this.botConfig = this.configService.getBotConfig();
    this.personalityConfig = this.configService.getPersonalityConfig();
    this.bot = new Telegraf(this.botConfig.token);
  }

  /**
   * Initialize the Telegram bot when the module is initialized
   */
  async onModuleInit() {
    this.logger.log('Initializing Telegram bot');

    // Set up basic handlers
    this.setupBaseHandlers();

    // Join configured channels if autoJoin is enabled
    await this.joinConfiguredChannels();

    // Start the bot based on configuration (webhook or polling)
    await this.startBot();

    this.logger.log(
      `Bot initialized with name: ${this.personalityConfig.name}`,
    );
  }

  /**
   * Clean up when the module is destroyed
   */
  async onModuleDestroy() {
    this.logger.log('Stopping Telegram bot');
    await this.bot.stop();
  }

  /**
   * Set up basic message and command handlers
   */
  private setupBaseHandlers() {
    // Handle /start command
    this.bot.command('start', async (ctx) => {
      const userName = ctx.from?.first_name || 'there';
      await ctx.reply(
        `Hello ${userName}! I'm ${this.personalityConfig.name}. ${this.personalityConfig.description}`,
      );
    });

    // Handle /help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `I'm ${this.personalityConfig.name}, your AI assistant.\n\n` +
          `You can talk to me about anything, and I'll respond based on my personality and knowledge.\n\n` +
          `Commands:\n` +
          `/start - Start a conversation\n` +
          `/help - Show this help message\n` +
          `/personality - Learn about my personality`,
      );
    });

    // Handle /personality command
    this.bot.command('personality', async (ctx) => {
      const traits = this.personalityConfig.traits.join(', ');
      await ctx.reply(
        `My personality:\n\n` +
          `Name: ${this.personalityConfig.name}\n` +
          `Description: ${this.personalityConfig.description}\n` +
          `Traits: ${traits}\n` +
          `Tone: ${this.personalityConfig.tone}\n` +
          `Style: ${this.personalityConfig.responseStyle}`,
      );
    });

    // Handle text messages (will be processed by registered handlers)
    this.bot.on(message('text'), async (ctx) => {
      for (const handler of this.messageHandlers) {
        await handler(ctx);
      }
    });
  }

  /**
   * Join channels configured in the YAML file
   */
  private async joinConfiguredChannels() {
    const channels = this.configService.getChannelsConfig();
    if (!channels || channels.length === 0) {
      this.logger.log('No channels configured to join');
      return;
    }

    for (const channel of channels) {
      if (channel.autoJoin) {
        try {
          // Note: The bot must be added to the channel manually by an admin
          // This just logs the intention, as bots can't join channels programmatically
          this.logger.log(
            `Bot should be added to channel: ${channel.name || channel.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to join channel ${channel.id}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Start the bot using webhook or polling based on configuration
   */
  private async startBot() {
    if (this.botConfig.webhook?.enabled) {
      // Set up webhook
      const webhookUrl = this.botConfig.webhook.url;
      const port = this.botConfig.webhook.port;

      this.logger.log(`Starting bot in webhook mode on port ${port}`);
      await this.bot.telegram.setWebhook(webhookUrl);

      // The actual webhook server will be set up in the controller
    } else {
      // Start polling
      this.logger.log('Starting bot in polling mode');
      await this.bot.launch();
    }
  }

  /**
   * Register a message handler
   * @param handler The function to handle messages
   */
  registerMessageHandler(handler: (ctx: Context) => Promise<void>) {
    this.messageHandlers.push(handler);
  }

  /**
   * Get the Telegraf bot instance
   */
  getBot(): Telegraf {
    return this.bot;
  }

  /**
   * Send a message to a chat
   * @param chatId The chat ID to send the message to
   * @param text The text to send
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${chatId}: ${error.message}`,
      );
    }
  }

  /**
   * Process webhook update
   * @param update The update object from Telegram
   */
  async handleWebhookUpdate(update: any): Promise<void> {
    await this.bot.handleUpdate(update);
  }
}
