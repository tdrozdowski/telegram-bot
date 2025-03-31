# NestJS Telegram Bot with LLM Integration

A NestJS-based Telegram bot that leverages Large Language Models (LLMs) like Grok 3 to generate responses based on a configurable personality.

## Features

- **YAML Configuration**: Easily configure the bot's personality, channels, and settings via a YAML file
- **LLM Integration**: Support for multiple LLM providers (Grok 3, OpenAI, Anthropic, custom)
- **Personality Customization**: Define the bot's name, traits, tone, and response style
- **Webhook & Polling Support**: Run in webhook mode for production or polling mode for development
- **Channel Management**: Configure channels for the bot to join
- **User Filtering**: Optionally restrict access to specific users
- **Chat History**: Maintains conversation context for more coherent responses
- **Custom Commands**: Support for custom commands with configurable prefix

## Prerequisites

- [Bun](https://bun.sh/) (v1.0.30 or later)
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- API key for your chosen LLM provider (Grok 3, OpenAI, etc.)

### Installing Bun

Bun provides different installation methods depending on your operating system:

#### macOS and Linux

You can install Bun using curl:

```bash
curl -fsSL https://bun.sh/install | bash
```

Or using npm:

```bash
npm install -g bun
```

#### Windows

Bun on Windows is available via WSL (Windows Subsystem for Linux):

1. Install WSL if you haven't already:
   ```bash
   wsl --install
   ```

2. Install Bun inside WSL:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

#### Verify Installation

After installation, verify that Bun is correctly installed:

```bash
bun --version
```

This should display the installed version of Bun (should be v1.0.30 or later).

## Project Setup

This project uses Bun and NestJS as its runtime and framework.

### Why Bun?

[Bun](https://bun.sh/) is a modern JavaScript runtime, package manager, and bundler all in one. It offers several advantages for this project:

- **Performance**: Bun is significantly faster than Node.js, providing quicker startup times and better runtime performance
- **TypeScript Support**: Built-in TypeScript support without requiring additional transpilation steps
- **Package Management**: Faster dependency installation and better compatibility with existing npm packages
- **Testing**: Integrated test runner with Jest compatibility
- **Developer Experience**: Improved developer experience with better error messages and debugging tools

### Common Commands

- `bun start` - Start the application using NestJS
- `bun start:dev` - Start the application in development mode with auto-reload
- `bun start:bun` - Start the application using Bun's optimized runtime
- `bun build` - Build the application using NestJS
- `bun build:bun` - Build the application using Bun's bundler
- `bun test` - Run tests
- `bun lint` - Run the linter
- `bun format` - Format the code

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/telegram-bot.git
   cd telegram-bot
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure your bot:
   - Copy `config/bot-config.yaml` to `config/bot-config.local.yaml`
   - Edit `config/bot-config.local.yaml` with your bot token, API keys, and preferences

## Running the Bot

### Development Mode

```bash
# Start in development mode (with auto-reload)
bun start:dev
```

### Production Mode

#### Standard NestJS Production Mode

```bash
# Build the application with NestJS
bun build

# Start in production mode
bun start:prod
```

#### Optimized Bun Production Mode

```bash
# Build the application with Bun's bundler
bun build:bun

# Start in production mode with Bun's optimized runtime
bun start:bun
```

The Bun-optimized mode provides better performance and lower memory usage, making it ideal for production environments.

### Using Environment Variables

You can override the config file path using an environment variable:

```bash
CONFIG_PATH=path/to/your/config.yaml bun start
```

## Docker Deployment

This project includes a multi-stage Dockerfile for easy deployment.

### Building the Docker Image

```bash
docker build -t telegram-bot .
```

### Running the Docker Container

```bash
docker run -p 3000:3000 -d --name telegram-bot telegram-bot
```

### Configuration with Docker

There are several ways to configure the application when running in Docker:

#### 1. Using a Custom Config File

You can mount a custom configuration file:

```bash
docker run -p 3000:3000 -v /path/to/your/config.yaml:/app/config/bot-config.yaml -d --name telegram-bot telegram-bot
```

#### 2. Using Environment Variables

You can pass the CONFIG_PATH environment variable:

```bash
docker run -p 3000:3000 -e CONFIG_PATH=/app/config/custom-config.yaml -d --name telegram-bot telegram-bot
```

#### 3. Using Docker Secrets (for sensitive data)

For production deployments, consider using Docker secrets for sensitive information like API keys and tokens.

### Example Docker Compose File

```yaml
version: '3.8'

services:
  telegram-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./config/bot-config.yaml:/app/config/bot-config.yaml
    restart: unless-stopped
```

## Configuration

The bot is configured via a YAML file. See `config/bot-config.yaml` for a sample configuration with comments.

### Key Configuration Sections

- **Bot Settings**: Configure the bot token and webhook/polling settings
- **Personality**: Define the bot's personality traits and response style
- **Channels**: List channels the bot should join
- **LLM Settings**: Configure the LLM provider, API key, and model
- **Additional Settings**: Configure logging, user access, and other behavior

## Custom Commands

The bot supports custom commands with a configurable prefix (default: `!`):

- `!reset` - Reset the conversation history
- `!debug` - Show debug information

## Webhook Setup

For production use, it's recommended to use webhook mode:

1. Set up a domain with SSL
2. Configure the webhook in your YAML file:
   ```yaml
   bot:
     webhook:
       enabled: true
       url: "https://your-domain.com/telegram/webhook"
       port: 3000
   ```
3. Start the bot in production mode

## Development

### Project Structure

- `src/config/` - Configuration module for loading YAML settings
- `src/telegram/` - Telegram integration module
- `src/llm/` - LLM integration module
- `src/bot/` - Core bot service that ties everything together
- `test/` - End-to-end tests and test mocks

### Testing

The project includes comprehensive end-to-end tests that verify the functionality of all components:

- **TelegramController Tests**: Test webhook and health endpoints
- **BotService Tests**: Verify message handling and integration with Telegram and LLM services
- **LlmService Tests**: Test integration with different LLM providers

#### Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun test:cov

# Run end-to-end tests
bun test:e2e
```

#### Test Structure

- `test/telegram.e2e-spec.ts` - Tests for the TelegramController
- `test/bot.e2e-spec.ts` - Tests for the BotService
- `test/llm.e2e-spec.ts` - Tests for the LlmService
- `test/mocks/` - Mock services used for testing

### Adding New Features

- **New LLM Providers**: Extend the `LlmService` class in `src/llm/llm.service.ts`
- **New Commands**: Add to the `handleCustomCommand` method in `src/bot/bot.service.ts`
- **Additional Personality Traits**: Extend the `BotConfig` interface in `src/config/config.interface.ts`
- **New Tests**: Add tests for new functionality in the appropriate test file

## License

MIT
