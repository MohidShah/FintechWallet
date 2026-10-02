/**
 * Root Application Module
 * Registers core framework modules, rate limiters, structured Pino logger, and feature modules.
 */
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // W6 Structured Pino Logger Configuration
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        redact: ['req.headers.authorization', 'req.body.password'],
      },
    }),
    // Rate Limiting Configuration (Throttle sensitive endpoints)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 30,  // Default 30 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    WalletModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
