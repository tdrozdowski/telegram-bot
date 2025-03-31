/**
 * Interface for the bot configuration loaded from YAML
 */
export interface BotConfig {
  // Bot settings
  bot: {
    token: string;
    webhook?: {
      enabled: boolean;
      url: string;
      port: number;
    };
    polling?: {
      enabled: boolean;
    };
  };

  // Personality settings
  personality: {
    name: string;
    description: string;
    traits: string[];
    tone: string;
    responseStyle: string;
  };

  // Channels to join
  channels: {
    id: string;
    name?: string;
    autoJoin: boolean;
  }[];

  // LLM settings
  llm: {
    provider: 'grok' | 'openai' | 'anthropic' | 'custom';
    apiKey: string;
    model: string;
    endpoint?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  };

  // Additional settings
  settings: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    allowedUsers?: string[];
    blacklistedUsers?: string[];
    commandPrefix?: string;
    responseDelay?: number;
  };
}
