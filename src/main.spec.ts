import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Mock fs and yaml modules
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('js-yaml', () => ({
  load: vi.fn(),
}));

// Import the bootstrap function from main.ts
import { bootstrap } from './main';

// Create mock for NestFactory
const mockApp = {
  listen: vi.fn().mockResolvedValue(undefined),
};

// Mock console.log
const originalConsoleLog = console.log;

describe('Bootstrap', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Set NODE_ENV to test
    process.env.NODE_ENV = 'test';

    // Mock NestFactory.create to return our mockApp
    vi.spyOn(NestFactory, 'create').mockResolvedValue(mockApp);

    // Set up mock implementations
    const mockConfig = {
      bot: {
        token: 'test-token',
        webhook: {
          enabled: true,
          url: 'https://example.com/webhook',
          port: 8443
        }
      },
      personality: {
        name: 'TestBot'
      },
      llm: {
        provider: 'openai',
        apiKey: 'test-api-key'
      }
    };

    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
    yaml.load.mockReturnValue(mockConfig);

    // Mock console.log
    console.log = vi.fn();
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
    // Restore all mocks
    vi.restoreAllMocks();
  });

  it('should bootstrap the application with default port', async () => {
    // Store original process.env
    const originalEnv = { ...process.env };

    // Delete PORT from environment
    delete process.env.PORT;

    // Call bootstrap directly
    const app = await bootstrap();

    // Verify NestFactory.create was called with AppModule
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);

    // Verify app.listen was called with default port 3000
    expect(mockApp.listen).toHaveBeenCalledWith(3000);

    // Verify console.log was called with the correct message
    expect(console.log).toHaveBeenCalledWith('Starting application on port 3000');

    // Restore original process.env
    process.env = originalEnv;
  });

  it('should bootstrap the application with custom port from environment', async () => {
    // Store original process.env
    const originalEnv = { ...process.env };

    // Set custom PORT in environment
    process.env.PORT = '4000';

    // Call bootstrap directly
    const app = await bootstrap();

    // Verify NestFactory.create was called with AppModule
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);

    // Verify app.listen was called with custom port 4000
    expect(mockApp.listen).toHaveBeenCalledWith('4000');

    // Verify console.log was called with the correct message
    expect(console.log).toHaveBeenCalledWith('Starting application on port 4000');

    // Restore original process.env
    process.env = originalEnv;
  });
});
