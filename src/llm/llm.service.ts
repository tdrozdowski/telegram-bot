import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { BotConfig } from '../config/config.interface';
import axios from 'axios';

/**
 * Interface for LLM response
 */
interface LlmResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Service for interacting with LLMs (Grok 3, OpenAI, etc.)
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly llmConfig: BotConfig['llm'];
  private readonly personalityConfig: BotConfig['personality'];

  constructor(private readonly configService: ConfigService) {
    this.llmConfig = this.configService.getLlmConfig();
    this.personalityConfig = this.configService.getPersonalityConfig();
  }

  /**
   * Generate a response using the configured LLM
   * @param userMessage The user's message
   * @param chatHistory Optional chat history for context
   */
  async generateResponse(
    userMessage: string,
    chatHistory: string[] = [],
  ): Promise<string> {
    try {
      const provider = this.llmConfig.provider;

      // Generate system prompt based on personality
      const systemPrompt =
        this.llmConfig.systemPrompt || this.generateSystemPrompt();

      // Call the appropriate LLM provider
      let response: LlmResponse;

      switch (provider) {
        case 'grok':
          response = await this.callGrokApi(
            systemPrompt,
            userMessage,
            chatHistory,
          );
          break;
        case 'openai':
          response = await this.callOpenAiApi(
            systemPrompt,
            userMessage,
            chatHistory,
          );
          break;
        case 'anthropic':
          response = await this.callAnthropicApi(
            systemPrompt,
            userMessage,
            chatHistory,
          );
          break;
        case 'custom':
          response = await this.callCustomApi(
            systemPrompt,
            userMessage,
            chatHistory,
          );
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }

      // Log token usage if available
      if (response.usage) {
        this.logger.debug(`Token usage: ${JSON.stringify(response.usage)}`);
      }

      return response.text;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
    }
  }

  /**
   * Generate a system prompt based on the personality configuration
   */
  private generateSystemPrompt(): string {
    const { name, description, traits, tone, responseStyle } =
      this.personalityConfig;
    const traitsText = traits.join(', ');

    return `You are ${name}, ${description}. 
Your personality traits include: ${traitsText}.
You speak in a ${tone} tone and your response style is ${responseStyle}.
Respond to the user's messages in character, maintaining this personality consistently.`;
  }

  /**
   * Call the Grok API (preferred LLM)
   */
  private async callGrokApi(
    systemPrompt: string,
    userMessage: string,
    chatHistory: string[],
  ): Promise<LlmResponse> {
    try {
      // Note: As of my knowledge cutoff, Grok 3's API details might not be fully public
      // This is a placeholder implementation based on expected API structure
      // Update this with the actual Grok 3 API when available

      const endpoint =
        this.llmConfig.endpoint || 'https://api.grok.x/v1/chat/completions';

      const response = await axios.post(
        endpoint,
        {
          model: this.llmConfig.model || 'grok-3',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.formatChatHistory(chatHistory),
            { role: 'user', content: userMessage },
          ],
          max_tokens: this.llmConfig.maxTokens || 1000,
          temperature: this.llmConfig.temperature || 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.llmConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      return {
        text: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      this.logger.error(`Grok API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call the OpenAI API
   */
  private async callOpenAiApi(
    systemPrompt: string,
    userMessage: string,
    chatHistory: string[],
  ): Promise<LlmResponse> {
    try {
      const endpoint =
        this.llmConfig.endpoint || 'https://api.openai.com/v1/chat/completions';

      const response = await axios.post(
        endpoint,
        {
          model: this.llmConfig.model || 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.formatChatHistory(chatHistory),
            { role: 'user', content: userMessage },
          ],
          max_tokens: this.llmConfig.maxTokens || 1000,
          temperature: this.llmConfig.temperature || 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.llmConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      return {
        text: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call the Anthropic API
   */
  private async callAnthropicApi(
    systemPrompt: string,
    userMessage: string,
    chatHistory: string[],
  ): Promise<LlmResponse> {
    try {
      const endpoint =
        this.llmConfig.endpoint || 'https://api.anthropic.com/v1/messages';

      // Format messages for Anthropic's API
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.formatChatHistory(chatHistory),
        { role: 'user', content: userMessage },
      ];

      const response = await axios.post(
        endpoint,
        {
          model: this.llmConfig.model || 'claude-3-opus-20240229',
          messages: messages,
          max_tokens: this.llmConfig.maxTokens || 1000,
          temperature: this.llmConfig.temperature || 0.7,
        },
        {
          headers: {
            'x-api-key': this.llmConfig.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      return {
        text: data.content[0].text,
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens:
            (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };
    } catch (error) {
      this.logger.error(`Anthropic API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call a custom API endpoint
   */
  private async callCustomApi(
    systemPrompt: string,
    userMessage: string,
    chatHistory: string[],
  ): Promise<LlmResponse> {
    try {
      if (!this.llmConfig.endpoint) {
        throw new Error('Custom API endpoint is required but not provided');
      }

      const response = await axios.post(
        this.llmConfig.endpoint,
        {
          model: this.llmConfig.model,
          system_prompt: systemPrompt,
          user_message: userMessage,
          chat_history: chatHistory,
          max_tokens: this.llmConfig.maxTokens || 1000,
          temperature: this.llmConfig.temperature || 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.llmConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      // Assuming the custom API returns a response with a text field
      return {
        text: data.text || data.response || data.content,
        usage: data.usage,
      };
    } catch (error) {
      this.logger.error(`Custom API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format chat history into a format suitable for LLM APIs
   */
  private formatChatHistory(
    chatHistory: string[],
  ): Array<{ role: string; content: string }> {
    const formattedHistory: Array<{ role: string; content: string }> = [];

    // Alternate between user and assistant roles
    for (let i = 0; i < chatHistory.length; i++) {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      formattedHistory.push({ role, content: chatHistory[i] });
    }

    return formattedHistory;
  }
}
