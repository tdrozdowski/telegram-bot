// Import reflect-metadata for NestJS decorators
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  console.log(`Starting application on port ${port}`);
  await app.listen(port);
}
bootstrap();
