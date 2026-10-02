/**
 * Main Application Bootstrap Entry Point
 * Initializes NestJS application with Pino structured logging, CORS, and port listening.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino Logger as application logger (W6)
  app.useLogger(app.get(Logger));

  // Enable CORS for frontend dashboard client
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Mini Secure Fintech Wallet API running on http://localhost:${port}`);
}

bootstrap();
