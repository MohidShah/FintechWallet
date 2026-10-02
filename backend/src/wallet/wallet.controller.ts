/**
 * Wallet Controller Module
 * Implements wallet endpoints: Balance Viewing (FR-3), Fund Transfer (FR-4), and Transaction History (FR-5).
 * Protected by JwtAuthGuard, OwnershipGuard (W1 BOLA), IdempotencyGuard (W5), and Throttle Rate Limiter.
 */
import { Controller, Get, Post, Body, Param, UseGuards, UsePipes, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { IdempotencyGuard } from '../common/guards/idempotency.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TransferSchema, TransferDto } from './dto/transfer.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * View Wallet Balance Endpoint (FR-3)
   * Protected by W1 OwnershipGuard: verifies JWT sub matches :userId route param.
   */
  @Get('balance/:userId')
  @UseGuards(OwnershipGuard)
  async getBalance(@Param('userId') userId: string) {
    return this.walletService.getWalletByUserId(userId);
  }

  /**
   * Fund Transfer Endpoint (FR-4)
   * - W2 Control: Sender ID derived strictly from @CurrentUser('sub') JWT claim.
   * - W4 Control: Executed inside atomic database transaction.
   * - W5 Control: Protected by IdempotencyGuard inspecting Idempotency-Key header.
   * - Rate limited: max 10 transfer requests per 60 seconds.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('transfer')
  @UseGuards(IdempotencyGuard)
  async transfer(
    @CurrentUser('sub') senderUserId: string,
    @Body(new ZodValidationPipe(TransferSchema)) dto: TransferDto,
    @Headers('idempotency-key') idempotencyKeyHeader: string,
  ) {
    const key = idempotencyKeyHeader || `auto-ik-${Date.now()}`;
    return this.walletService.executeTransfer(senderUserId, dto, key);
  }

  /**
   * Transaction History Endpoint (FR-5)
   * Protected by W1 OwnershipGuard: verifies JWT sub matches :userId route param.
   */
  @Get('transactions/:userId')
  @UseGuards(OwnershipGuard)
  async getTransactions(@Param('userId') userId: string) {
    return this.walletService.getTransactionHistory(userId);
  }
}
