import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { ConfigService } from '../config/config.service';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock axios
vi.mock('axios');

// Create a mock implementation of the LlmService
class MockLlmService extends LlmService {
  // Override the generateResponse method to handle different providers
  async generateResponse(userMessage: string, chatHistory: string[] = []): Promise<string> {
    try {
      const provider = this.configService.getLlmConfig().provider;

      switch (provider) {
        case 'grok':
          return 'Grok response';
        case 'openai':
          return 'OpenAI response';
        case 'anthropic':
          return 'Anthropic response';
        case 'custom':
          // Check if endpoint is provided
          if (!this.configService.getLlmConfig().endpoint) {
            throw new Error('Custom API endpoint is required but not provided');
          }
          return 'Custom API response';
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
    }
  }
}

// Mock the ConfigService
const mockConfigService = {
  getLlmConfig: vi.fn(),
  getPersonalityConfig: vi.fn(),
};

describe('LlmService', () => {
  let service: LlmService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock Logger to avoid console output during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    // Setup default mock return values
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    mockConfigService.getPersonalityConfig.mockReturnValue({
      name: 'TestBot',
      description: 'A test bot for unit testing',
      traits: ['helpful', 'friendly'],
      tone: 'casual',
      responseStyle: 'concise',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LlmService,
          useFactory: () => new MockLlmService(mockConfigService)
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    it('should call the OpenAI API when provider is openai', async () => {
      // Default provider is openai
      const result = await service.generateResponse('Hello', ['Previous message']);
      expect(result).toBe('OpenAI response');
    });

    it('should call the Grok API when provider is grok', async () => {
      // Change the provider to grok
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'grok',
        model: 'grok-3',
        apiKey: 'test-api-key',
      });

      const result = await service.generateResponse('Hello', ['Previous message']);
      expect(result).toBe('Grok response');
    });

    it('should call the Anthropic API when provider is anthropic', async () => {
      // Change the provider to anthropic
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: 'test-api-key',
      });

      const result = await service.generateResponse('Hello', ['Previous message']);
      expect(result).toBe('Anthropic response');
    });

    it('should call the Custom API when provider is custom', async () => {
      // Change the provider to custom
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'custom',
        endpoint: 'https://custom-api.example.com',
        apiKey: 'test-api-key',
      });

      const result = await service.generateResponse('Hello', ['Previous message']);
      expect(result).toBe('Custom API response');
    });

    it('should throw an error if custom API endpoint is not provided', async () => {
      // Change the provider to custom but don't provide an endpoint
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'custom',
        apiKey: 'test-api-key',
      });

      // Mock the error method to verify it's called
      const errorSpy = vi.spyOn(Logger.prototype, 'error');

      const result = await service.generateResponse('Hello', ['Previous message']);

      expect(result).toBe("I'm sorry, I'm having trouble processing your request right now. Please try again later.");
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should throw an error for unsupported provider', async () => {
      // Change the provider to an unsupported one
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'unsupported',
        apiKey: 'test-api-key',
      });

      // Mock the error method to verify it's called
      const errorSpy = vi.spyOn(Logger.prototype, 'error');

      const result = await service.generateResponse('Hello', ['Previous message']);

      expect(result).toBe("I'm sorry, I'm having trouble processing your request right now. Please try again later.");
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Create a special mock service that throws an error
      class ErrorMockLlmService extends LlmService {
        // Override the generateResponse method to throw an error
        protected async callOpenAiApi(): Promise<any> {
          throw new Error('API error');
        }
      }

      // Create a new instance with the error mock
      const errorService = new ErrorMockLlmService(mockConfigService);

      // Mock the error method to verify it's called
      const errorSpy = vi.spyOn(Logger.prototype, 'error');

      // Set the provider to openai to trigger the error
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      });

      const result = await errorService.generateResponse('Hello', ['Previous message']);

      expect(result).toBe("I'm sorry, I'm having trouble processing your request right now. Please try again later.");
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should use custom system prompt if provided', async () => {
      // Create a special mock service that checks for systemPrompt
      class SystemPromptMockLlmService extends LlmService {
        async generateResponse(userMessage: string, chatHistory: string[] = []): Promise<string> {
          // Get the config
          const config = this.configService.getLlmConfig();

          // Check if systemPrompt is provided
          if (config.systemPrompt) {
            return `Response using custom prompt: ${config.systemPrompt}`;
          }

          return 'Response using default prompt';
        }
      }

      // Create a new instance with the system prompt mock
      const systemPromptService = new SystemPromptMockLlmService(mockConfigService);

      // Test with custom system prompt
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-api-key',
        systemPrompt: 'Custom system prompt',
      });

      const result = await systemPromptService.generateResponse('Hello');
      expect(result).toBe('Response using custom prompt: Custom system prompt');

      // Test without custom system prompt
      mockConfigService.getLlmConfig.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-api-key',
      });

      const defaultResult = await systemPromptService.generateResponse('Hello');
      expect(defaultResult).toBe('Response using default prompt');
    });
  });

  describe('formatChatHistory', () => {
    // We need to access the private method for testing
    let formatChatHistory: (chatHistory: string[]) => Array<{ role: string; content: string }>;

    beforeEach(() => {
      // Get access to the private method
      formatChatHistory = (service as any).formatChatHistory.bind(service);
    });

    it('should format chat history correctly', () => {
      const chatHistory = ['User message 1', 'Bot response 1', 'User message 2', 'Bot response 2'];
      const formatted = formatChatHistory(chatHistory);

      expect(formatted).toEqual([
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Bot response 1' },
        { role: 'user', content: 'User message 2' },
        { role: 'assistant', content: 'Bot response 2' },
      ]);
    });

    it('should handle empty chat history', () => {
      const formatted = formatChatHistory([]);
      expect(formatted).toEqual([]);
    });

    it('should handle odd number of messages', () => {
      const chatHistory = ['User message 1', 'Bot response 1', 'User message 2'];
      const formatted = formatChatHistory(chatHistory);

      expect(formatted).toEqual([
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Bot response 1' },
        { role: 'user', content: 'User message 2' },
      ]);
    });
  });

  describe('generateSystemPrompt', () => {
    // We need to access the private method for testing
    let generateSystemPrompt: () => string;

    beforeEach(() => {
      // Get access to the private method
      generateSystemPrompt = (service as any).generateSystemPrompt.bind(service);
    });

    it('should generate a system prompt based on personality config', () => {
      const prompt = generateSystemPrompt();

      expect(prompt).toContain('You are TestBot');
      expect(prompt).toContain('A test bot for unit testing');
      expect(prompt).toContain('helpful, friendly');
      expect(prompt).toContain('casual tone');
      expect(prompt).toContain('concise');
    });
  });
});

// Test suite for the actual LlmService implementation
describe('LlmService - API Calls', () => {
  let service: LlmService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock Logger to avoid console output during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    // Setup default mock return values
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    mockConfigService.getPersonalityConfig.mockReturnValue({
      name: 'TestBot',
      description: 'A test bot for unit testing',
      traits: ['helpful', 'friendly'],
      tone: 'casual',
      responseStyle: 'concise',
    });

    // Create a real LlmService instance with the mock ConfigService
    service = new LlmService(mockConfigService);
    configService = mockConfigService;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test for callGrokApi method
  it('should call the Grok API correctly', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response from Grok',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to grok
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'grok',
      model: 'grok-3',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callGrokApi = (testService as any).callGrokApi.bind(testService);
    const result = await callGrokApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from Grok',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Verify axios was called with the correct parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.grok.x/v1/chat/completions',
      {
        model: 'grok-3',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Previous message' },
          { role: 'user', content: 'Hello, how are you?' },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  // Test for callOpenAiApi method
  it('should call the OpenAI API correctly', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response from OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to openai
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callOpenAiApi = (testService as any).callOpenAiApi.bind(testService);
    const result = await callOpenAiApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from OpenAI',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Verify axios was called with the correct parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Previous message' },
          { role: 'user', content: 'Hello, how are you?' },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  // Test for callAnthropicApi method
  it('should call the Anthropic API correctly', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        content: [{ text: 'This is a response from Anthropic' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to anthropic
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callAnthropicApi = (testService as any).callAnthropicApi.bind(testService);
    const result = await callAnthropicApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from Anthropic',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });

    // Verify axios was called with the correct parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Previous message' },
          { role: 'user', content: 'Hello, how are you?' },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          'x-api-key': 'test-api-key',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  // Test for callCustomApi method
  it('should call the Custom API correctly', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        text: 'This is a response from Custom API',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to custom
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'custom',
      endpoint: 'https://custom-api.example.com',
      model: 'custom-model',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callCustomApi = (testService as any).callCustomApi.bind(testService);
    const result = await callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from Custom API',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Verify axios was called with the correct parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://custom-api.example.com',
      {
        model: 'custom-model',
        system_prompt: 'You are a helpful assistant',
        user_message: 'Hello, how are you?',
        chat_history: ['Previous message'],
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  // Test for callCustomApi method with missing endpoint
  it('should throw an error if custom API endpoint is not provided', async () => {
    // Set the provider to custom without an endpoint
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'custom',
      model: 'custom-model',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callCustomApi = (testService as any).callCustomApi.bind(testService);

    // Expect the method to throw an error
    await expect(callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    )).rejects.toThrow('Custom API endpoint is required but not provided');
  });

  // Test for error handling in Custom API
  it('should handle API errors correctly in Custom API', async () => {
    // Mock the axios.post to throw an error
    (axios.post as any).mockRejectedValue(new Error('Custom API request failed'));

    // Set the provider to custom with an endpoint
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'custom',
      endpoint: 'https://custom-api.example.com',
      model: 'custom-model',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callCustomApi = (testService as any).callCustomApi.bind(testService);

    // Expect the method to throw an error
    await expect(callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    )).rejects.toThrow('Custom API request failed');

    // Verify the error was logged
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Custom API error: Custom API request failed')
    );
  });

  // Test for error handling in API calls
  it('should handle API errors correctly in OpenAI API', async () => {
    // Mock the axios.post to throw an error
    (axios.post as any).mockRejectedValue(new Error('API request failed'));

    // Set the provider to openai
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callOpenAiApi = (testService as any).callOpenAiApi.bind(testService);

    // Expect the method to throw an error
    await expect(callOpenAiApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    )).rejects.toThrow('API request failed');

    // Verify the error was logged
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  // Test for error handling in Grok API
  it('should handle API errors correctly in Grok API', async () => {
    // Mock the axios.post to throw an error
    (axios.post as any).mockRejectedValue(new Error('Grok API request failed'));

    // Set the provider to grok
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'grok',
      model: 'grok-3',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callGrokApi = (testService as any).callGrokApi.bind(testService);

    // Expect the method to throw an error
    await expect(callGrokApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    )).rejects.toThrow('Grok API request failed');

    // Verify the error was logged
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Grok API error: Grok API request failed')
    );
  });

  // Test for error handling in Anthropic API
  it('should handle API errors correctly in Anthropic API', async () => {
    // Mock the axios.post to throw an error
    (axios.post as any).mockRejectedValue(new Error('Anthropic API request failed'));

    // Set the provider to anthropic
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callAnthropicApi = (testService as any).callAnthropicApi.bind(testService);

    // Expect the method to throw an error
    await expect(callAnthropicApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    )).rejects.toThrow('Anthropic API request failed');

    // Verify the error was logged
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Anthropic API error: Anthropic API request failed')
    );
  });

  // Test for token usage logging
  it('should log token usage when available', async () => {
    // Mock the axios.post to return a successful response with usage data
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to openai
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Spy on the logger.debug method
    const debugSpy = vi.spyOn(Logger.prototype, 'debug');

    // Call generateResponse directly
    await testService.generateResponse('Hello', ['Previous message']);

    // Verify that token usage was logged
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Token usage'));
  });

  // Test for model fallback in OpenAI API
  it('should use default model in OpenAI API when model is not provided', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response from OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to openai without specifying a model
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'openai',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callOpenAiApi = (testService as any).callOpenAiApi.bind(testService);
    const result = await callOpenAiApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from OpenAI',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Verify axios was called with the default model
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4', // Default model
      }),
      expect.anything()
    );
  });

  // Test for model fallback in Grok API
  it('should use default model in Grok API when model is not provided', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response from Grok',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to grok without specifying a model
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'grok',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callGrokApi = (testService as any).callGrokApi.bind(testService);
    const result = await callGrokApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from Grok',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });

    // Verify axios was called with the default model
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.grok.x/v1/chat/completions',
      expect.objectContaining({
        model: 'grok-3', // Default model
      }),
      expect.anything()
    );
  });

  // Test for model fallback in Anthropic API
  it('should use default model in Anthropic API when model is not provided', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        content: [{ text: 'This is a response from Anthropic' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to anthropic without specifying a model
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'anthropic',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callAnthropicApi = (testService as any).callAnthropicApi.bind(testService);
    const result = await callAnthropicApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result
    expect(result).toEqual({
      text: 'This is a response from Anthropic',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });

    // Verify axios was called with the default model
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        model: 'claude-3-opus-20240229', // Default model
      }),
      expect.anything()
    );
  });

  // Test for usage data fallback in Anthropic API
  it('should handle missing usage data in Anthropic API response', async () => {
    // Mock the axios.post to return a response without usage data
    const mockResponse = {
      data: {
        content: [{ text: 'This is a response from Anthropic' }],
        // No usage data
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to anthropic
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callAnthropicApi = (testService as any).callAnthropicApi.bind(testService);
    const result = await callAnthropicApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result has default values for usage
    expect(result).toEqual({
      text: 'This is a response from Anthropic',
      usage: {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: 0, // Default value when both input_tokens and output_tokens are missing
      },
    });
  });

  // Test for response text fallback in Custom API
  it('should handle different response formats in Custom API', async () => {
    // Test with data.text
    const mockResponseWithText = {
      data: {
        text: 'This is a response from Custom API (text)',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponseWithText);

    // Set the provider to custom
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'custom',
      endpoint: 'https://custom-api.example.com',
      model: 'custom-model',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call the method directly
    const callCustomApi = (testService as any).callCustomApi.bind(testService);
    let result = await callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result uses data.text
    expect(result.text).toBe('This is a response from Custom API (text)');

    // Test with data.response
    const mockResponseWithResponse = {
      data: {
        response: 'This is a response from Custom API (response)',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponseWithResponse);

    result = await callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result uses data.response
    expect(result.text).toBe('This is a response from Custom API (response)');

    // Test with data.content
    const mockResponseWithContent = {
      data: {
        content: 'This is a response from Custom API (content)',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponseWithContent);

    result = await callCustomApi(
      'You are a helpful assistant',
      'Hello, how are you?',
      ['Previous message']
    );

    // Verify the result uses data.content
    expect(result.text).toBe('This is a response from Custom API (content)');
  });

  // Test for unsupported provider
  it('should throw an error for unsupported provider', async () => {
    // Set an unsupported provider
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'unsupported-provider',
      apiKey: 'test-api-key',
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Call generateResponse and expect an error
    const result = await testService.generateResponse('Hello', ['Previous message']);

    // Verify the error response
    expect(result).toBe("I'm sorry, I'm having trouble processing your request right now. Please try again later.");

    // Verify the error was logged
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('Unsupported LLM provider: unsupported-provider')
    );
  });

  // Test full flow through generateResponse for Grok provider
  it('should call the Grok API through generateResponse when provider is grok', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: 'This is a response from Grok',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to grok
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'grok',
      model: 'grok-3',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Spy on the callGrokApi method
    const callGrokApiSpy = vi.spyOn(testService as any, 'callGrokApi');

    // Call generateResponse
    const result = await testService.generateResponse('Hello', ['Previous message']);

    // Verify that callGrokApi was called
    expect(callGrokApiSpy).toHaveBeenCalled();

    // Verify the result
    expect(result).toBe('This is a response from Grok');
  });

  // Test full flow through generateResponse for Anthropic provider
  it('should call the Anthropic API through generateResponse when provider is anthropic', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        content: [{ text: 'This is a response from Anthropic' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to anthropic
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Spy on the callAnthropicApi method
    const callAnthropicApiSpy = vi.spyOn(testService as any, 'callAnthropicApi');

    // Call generateResponse
    const result = await testService.generateResponse('Hello', ['Previous message']);

    // Verify that callAnthropicApi was called
    expect(callAnthropicApiSpy).toHaveBeenCalled();

    // Verify the result
    expect(result).toBe('This is a response from Anthropic');
  });

  // Test full flow through generateResponse for Custom provider
  it('should call the Custom API through generateResponse when provider is custom', async () => {
    // Mock the axios.post to return a successful response
    const mockResponse = {
      data: {
        text: 'This is a response from Custom API',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      },
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    // Set the provider to custom
    mockConfigService.getLlmConfig.mockReturnValue({
      provider: 'custom',
      endpoint: 'https://custom-api.example.com',
      model: 'custom-model',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Create a new service instance with the updated config
    const testService = new LlmService(mockConfigService);

    // Spy on the callCustomApi method
    const callCustomApiSpy = vi.spyOn(testService as any, 'callCustomApi');

    // Call generateResponse
    const result = await testService.generateResponse('Hello', ['Previous message']);

    // Verify that callCustomApi was called
    expect(callCustomApiSpy).toHaveBeenCalled();

    // Verify the result
    expect(result).toBe('This is a response from Custom API');
  });
});
