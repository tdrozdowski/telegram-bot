import { BotConfig } from '../../src/config/config.interface';

export class MockLlmService {
  private mockResponses: Map<string, string> = new Map();

  constructor() {
    // Set up some default mock responses
    this.mockResponses.set('hello', 'Hello! How can I help you today?');
    this.mockResponses.set(
      'help',
      "I'm here to help. What do you need assistance with?",
    );
    this.mockResponses.set(
      'default',
      "I'm a mock LLM service for testing purposes.",
    );
  }

  // Mock the generateResponse method
  async generateResponse(
    userMessage: string,
    chatHistory: string[] = [],
  ): Promise<string> {
    // Check if we have a specific mock response for this message
    const lowerMessage = userMessage.toLowerCase();

    for (const [key, value] of this.mockResponses.entries()) {
      if (lowerMessage.includes(key)) {
        return value;
      }
    }

    // Return the default response if no specific match
    return this.mockResponses.get('default') || 'Mock response';
  }

  // Helper method to set custom mock responses for testing
  setMockResponse(trigger: string, response: string): void {
    this.mockResponses.set(trigger.toLowerCase(), response);
  }

  // Reset mock responses
  resetMockResponses(): void {
    this.mockResponses.clear();
    this.mockResponses.set('hello', 'Hello! How can I help you today?');
    this.mockResponses.set(
      'help',
      "I'm here to help. What do you need assistance with?",
    );
    this.mockResponses.set(
      'default',
      "I'm a mock LLM service for testing purposes.",
    );
  }
}
