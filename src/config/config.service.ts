import { Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { BotConfig } from './config.interface';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private config: BotConfig;

  constructor() {
    this.loadConfig();
  }

  /**
   * Load the configuration from the YAML file
   */
  private loadConfig(): void {
    try {
      const configPath = process.env.CONFIG_PATH || 'config/bot-config.yaml';
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents) as BotConfig;
      this.logger.log(`Configuration loaded from ${configPath}`);
      this.validateConfig();
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate the configuration
   */
  private validateConfig(): void {
    // Check required fields
    if (!this.config.bot?.token) {
      throw new Error('Bot token is required in configuration');
    }

    if (!this.config.personality) {
      throw new Error('Personality configuration is required');
    }

    if (!this.config.llm?.provider || !this.config.llm?.apiKey) {
      throw new Error('LLM provider and API key are required in configuration');
    }

    // Validate webhook and polling settings
    if (this.config.bot.webhook?.enabled && this.config.bot.polling?.enabled) {
      this.logger.warn(
        'Both webhook and polling are enabled. Using webhook mode.',
      );
      this.config.bot.polling.enabled = false;
    }

    if (
      this.config.bot.webhook?.enabled &&
      (!this.config.bot.webhook.url || !this.config.bot.webhook.port)
    ) {
      throw new Error(
        'Webhook URL and port are required when webhook is enabled',
      );
    }

    this.logger.log('Configuration validation successful');
  }

  /**
   * Get the entire configuration
   */
  getConfig(): BotConfig {
    return this.config;
  }

  /**
   * Get the bot configuration
   */
  getBotConfig(): BotConfig['bot'] {
    return this.config.bot;
  }

  /**
   * Get the personality configuration
   */
  getPersonalityConfig(): BotConfig['personality'] {
    return this.config.personality;
  }

  /**
   * Get the channels configuration
   */
  getChannelsConfig(): BotConfig['channels'] {
    return this.config.channels;
  }

  /**
   * Get the LLM configuration
   */
  getLlmConfig(): BotConfig['llm'] {
    return this.config.llm;
  }

  /**
   * Get the settings configuration
   */
  getSettingsConfig(): BotConfig['settings'] {
    return this.config.settings;
  }
}
