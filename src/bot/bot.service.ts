import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramService } from '../telegram/telegram.service';
import { LlmService } from '../llm/llm.service';
import { ConfigService } from '../config/config.service';
import { BotConfig } from '../config/config.interface';

/**
 * Simple in-memory chat history store
 * In a production environment, this should be replaced with a database
 */
interface ChatHistory {
  [chatId: string]: string[];
}

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private readonly chatHistory: ChatHistory = {};
  private readonly settings: BotConfig['settings'];
  private readonly maxHistoryLength = 10; // Keep last 10 messages for context

  constructor(
    private readonly telegramService: TelegramService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {
    // Default settings in case configService is undefined or getSettingsConfig returns undefined
    this.settings = {
      logLevel: 'info',
      allowedUsers: [],
      blacklistedUsers: [],
      commandPrefix: '/',
      responseDelay: 0,
    };

    // Try to get settings from configService if available
    try {
      if (this.configService && typeof this.configService.getSettingsConfig === 'function') {
        const configSettings = this.configService.getSettingsConfig();
        if (configSettings) {
          this.settings = configSettings;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load settings from config service: ${error.message}`);
    }
  }

  /**
   * Initialize the bot service
   */
  async onModuleInit() {
    this.logger.log('Initializing bot service');

    // Register message handler with the Telegram service if available
    try {
      if (this.telegramService && typeof this.telegramService.registerMessageHandler === 'function') {
        this.telegramService.registerMessageHandler(this.handleMessage.bind(this));
      } else {
        this.logger.warn('TelegramService not available or missing registerMessageHandler method');
      }
    } catch (error) {
      this.logger.error(`Error registering message handler: ${error.message}`);
    }

    this.logger.log('Bot service initialized');
  }

  /**
   * Handle incoming messages from Telegram
   */
  private async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.message || !('text' in ctx.message)) {
      return; // Not a text message
    }

    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const messageText = ctx.message.text;

    // Check if user is allowed (if allowedUsers is configured)
    if (
      this.settings.allowedUsers?.length &&
      !this.settings.allowedUsers.includes(userId)
    ) {
      this.logger.warn(`Blocked message from unauthorized user: ${userId}`);
      return;
    }

    // Check if user is blacklisted
    if (this.settings.blacklistedUsers?.includes(userId)) {
      this.logger.warn(`Blocked message from blacklisted user: ${userId}`);
      return;
    }

    // Check for command prefix if configured
    if (
      this.settings.commandPrefix &&
      messageText.startsWith(this.settings.commandPrefix)
    ) {
      await this.handleCustomCommand(ctx, messageText);
      return;
    }

    // Store user message in chat history
    this.addToChatHistory(chatId, messageText);

    // Show typing indicator
    await ctx.telegram.sendChatAction(chatId, 'typing');

    try {
      // Generate response using LLM
      const response = await this.generateResponse(chatId, messageText);

      // Add artificial delay if configured
      if (this.settings.responseDelay && this.settings.responseDelay > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.settings.responseDelay),
        );
      }

      // Send response
      await ctx.reply(response);

      // Store bot response in chat history
      this.addToChatHistory(chatId, response);
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      await ctx.reply(
        "I'm sorry, I encountered an error while processing your message.",
      );
    }
  }

  /**
   * Handle custom commands (prefixed with commandPrefix)
   */
  private async handleCustomCommand(ctx: Context, text: string): Promise<void> {
    const command = text.substring(this.settings.commandPrefix.length).trim();

    switch (command.toLowerCase()) {
      case 'reset':
        // Reset chat history
        const chatId = ctx.chat.id.toString();
        this.chatHistory[chatId] = [];
        await ctx.reply("I've reset our conversation history.");
        break;

      case 'debug':
        // Show debug information
        const debugInfo = {
          chatId: ctx.chat.id,
          userId: ctx.from.id,
          historyLength: this.chatHistory[ctx.chat.id.toString()]?.length || 0,
          botName: this.configService.getPersonalityConfig().name,
          llmProvider: this.configService.getLlmConfig().provider,
        };
        await ctx.reply(
          `Debug information:\n${JSON.stringify(debugInfo, null, 2)}`,
        );
        break;

      default:
        // Unknown command
        await ctx.reply(`Unknown command: ${command}`);
    }
  }

  /**
   * Generate a response using the LLM service
   */
  private async generateResponse(
    chatId: string,
    userMessage: string,
  ): Promise<string> {
    // Get chat history for context
    const history = this.getChatHistory(chatId);

    // Generate response
    return this.llmService.generateResponse(userMessage, history);
  }

  /**
   * Add a message to the chat history
   */
  private addToChatHistory(chatId: string, message: string): void {
    if (!this.chatHistory[chatId]) {
      this.chatHistory[chatId] = [];
    }

    this.chatHistory[chatId].push(message);

    // Limit history length
    if (this.chatHistory[chatId].length > this.maxHistoryLength * 2) {
      // *2 because each exchange has 2 messages
      this.chatHistory[chatId] = this.chatHistory[chatId].slice(
        -this.maxHistoryLength * 2,
      );
    }
  }

  /**
   * Get the chat history for a chat
   */
  private getChatHistory(chatId: string): string[] {
    return this.chatHistory[chatId] || [];
  }
}
