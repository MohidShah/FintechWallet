/**
 * Wallet Module
 * Configures wallet providers, controllers, and security guards.
 */
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';

@Module({
  imports: [PrismaModule],
  controllers: [WalletController],
  providers: [WalletService, AuditService, OwnershipGuard, IdempotencyGuard],
  exports: [WalletService],
})
export class WalletModule {}
