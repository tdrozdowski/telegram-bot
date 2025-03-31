// Import reflect-metadata for NestJS decorators
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Export the bootstrap function for testing
export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  console.log(`Starting application on port ${port}`);
  await app.listen(port);
  return app;
}

// Only call bootstrap in production, not during testing
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}
