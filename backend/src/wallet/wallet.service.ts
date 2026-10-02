/**
 * ============================================================================
 * WALLET SERVICE (Core Transfer Engine & Security Controls)
 * ============================================================================
 * What this file does:
 * Handles balance inquiries and processes fund transfers between wallets.
 * Implements 3 core security controls required by the assignment:
 * 
 * 1. [W2] Server-Derived Sender Identity: The sender ID is derived strictly from
 *    the logged-in JWT user payload, ignoring any sender ID sent in the request body.
 * 2. [W4] Atomic Transactions: Debit from sender and credit to receiver happen inside
 *    a single `prisma.$transaction([])` so partial transfers are impossible.
 * 3. [W5] Idempotency Control: Saves client `Idempotency-Key` headers so double-submitting
 *    a transfer never charges the user twice.
 * ============================================================================
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Returns current wallet balance and owner details.
   */
  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, username: true, cnic: true },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet record not found.');
    }

    return wallet;
  }

  /**
   * Executes a fund transfer between two registered wallets.
   * 
   * Addresses Security Controls:
   * - [W2] Server-Derived Sender Identity
   * - [W4] Atomic DB Transaction
   * - [W5] Idempotency Persistence
   * - [Control #40, #89] Anti-Fraud Velocity Engine
   * - [Control #48, #59, #99] Step-Up Re-Authentication Guard
   */
  async executeTransfer(authenticatedUserId: string, dto: TransferDto, idempotencyKey: string) {
    // [SECURITY CONTROL W2] Sender ID is strictly derived from JWT session (authenticatedUserId)
    const senderUserId = authenticatedUserId;

    // Fetch sender user & wallet
    const senderUser = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      include: { wallet: true },
    });

    if (!senderUser || !senderUser.wallet) {
      throw new BadRequestException('Sender wallet account not found.');
    }

    if (senderUser.isBlocked) {
      throw new BadRequestException('Account Blocked: Your account has been suspended by the Security Officer. Please contact support.');
    }

    // Fetch receiver user & wallet
    const receiverUser = await this.prisma.user.findUnique({
      where: { email: dto.receiverEmail.toLowerCase() },
      include: { wallet: true },
    });

    if (!receiverUser || !receiverUser.wallet) {
      throw new BadRequestException('Transfer failed: Invalid recipient or insufficient balance.');
    }

    if (senderUser.id === receiverUser.id) {
      throw new BadRequestException('Cannot transfer funds to your own wallet account.');
    }

    if (receiverUser.role === 'ADMIN' || receiverUser.email === 'admin@securewallet.io') {
      throw new BadRequestException('Transfer failed: Cannot send funds to an administrative system account.');
    }

    const amountDecimal = Number(dto.amount);
    if (isNaN(amountDecimal) || amountDecimal <= 0) {
      throw new BadRequestException('Validation Error: Transfer amount must be greater than 0.');
    }

    // Anti-Fraud Control: Single Transaction Limit (Max PKR 100,000)
    if (amountDecimal > 100000) {
      throw new BadRequestException('Anti-Fraud Risk Engine: Single transfer amount cannot exceed PKR 100,000.');
    }

    // Anti-Fraud Control: Velocity Limit (Max 3 transfers per 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentTransfersCount = await this.prisma.transaction.count({
      where: {
        senderWalletId: senderUser.wallet.id,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (recentTransfersCount >= 3) {
      await this.auditService.logEvent(
        'VELOCITY_LIMIT_EXCEEDED',
        senderUserId,
        'FAILURE',
        undefined,
        { count: recentTransfersCount, limit: 3 }
      );
      throw new BadRequestException('Anti-Fraud Velocity Limit: Maximum 3 transfers permitted per minute. Please try again shortly.');
    }

    // Step-Up Authentication Control (Control #48, #59, #99): Require password re-verification if amount > PKR 5,000
    if (amountDecimal > 5000) {
      if (!dto.stepUpPassword) {
        throw new BadRequestException('STEP_UP_REQUIRED: High-risk transfer over PKR 5,000 requires step-up password confirmation.');
      }
      const isPassValid = await argon2.verify(senderUser.passwordHash, dto.stepUpPassword);
      if (!isPassValid) {
        await this.auditService.logEvent(
          'STEPUP_AUTH_FAILED',
          senderUserId,
          'FAILURE',
          undefined,
          { attemptedAmount: amountDecimal }
        );
        throw new BadRequestException('Step-Up Authentication Failed: Invalid confirmation password.');
      }
    }

    const currentBalance = Number(senderUser.wallet.balance);
    if (currentBalance < amountDecimal) {
      await this.auditService.logEvent(
        'TRANSFER_FAILED_INSUFFICIENT_FUNDS',
        senderUserId,
        'FAILURE',
        undefined,
        { attemptedAmount: amountDecimal, currentBalance }
      );
      throw new BadRequestException('Transfer failed: Insufficient wallet balance.');
    }

    // [SECURITY CONTROL W4] Atomic DB Transaction ($transaction)
    // Both balance updates and transaction logging succeed or fail TOGETHER as 1 unit.
    const result = await this.prisma.$transaction(async (tx) => {
      // Step A: Debit Sender Balance
      await tx.wallet.update({
        where: { id: senderUser.wallet.id },
        data: {
          balance: { decrement: amountDecimal },
        },
      });

      // Step B: Credit Receiver Balance
      await tx.wallet.update({
        where: { id: receiverUser.wallet.id },
        data: {
          balance: { increment: amountDecimal },
        },
      });

      // Step C: Create Transaction Record
      const transactionRecord = await tx.transaction.create({
        data: {
          senderWalletId: senderUser.wallet.id,
          receiverWalletId: receiverUser.wallet.id,
          amount: amountDecimal,
          note: dto.note || null,
          status: 'SUCCESS',
          idempotencyKey,
        },
      });

      const responsePayload = {
        success: true,
        message: 'Transfer completed successfully!',
        transaction: {
          id: transactionRecord.id,
          senderName: senderUser.fullName,
          senderEmail: senderUser.email,
          receiverName: receiverUser.fullName,
          receiverEmail: receiverUser.email,
          amount: amountDecimal,
          note: dto.note,
          status: 'SUCCESS',
          createdAt: transactionRecord.createdAt.toISOString(),
          idempotencyKey,
        },
      };

      // [SECURITY CONTROL W5] Store processed idempotency key in DB
      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId: senderUserId,
          requestPath: '/wallet/transfer',
          responseBody: JSON.stringify(responsePayload),
          statusCode: 201,
        },
      });

      return responsePayload;
    });

    // Log Audit Event (W6)
    await this.auditService.logEvent(
      'TRANSFER_EXECUTE_SUCCESS',
      senderUserId,
      'SUCCESS',
      undefined,
      {
        transactionId: result.transaction.id,
        receiverEmail: receiverUser.email,
        amount: amountDecimal,
        idempotencyKey,
      }
    );

    return result;
  }

  /**
   * Retrieves transaction history for authenticated user (FR-5).
   */
  async getTransactionHistory(userId: string) {
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!userWallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { senderWalletId: userWallet.id },
          { receiverWalletId: userWallet.id },
        ],
      },
      include: {
        senderWallet: { include: { user: { select: { fullName: true, email: true } } } },
        receiverWallet: { include: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(tx => ({
      id: tx.id,
      senderWalletId: tx.senderWalletId,
      senderName: tx.senderWallet.user.fullName,
      senderEmail: tx.senderWallet.user.email,
      receiverWalletId: tx.receiverWalletId,
      receiverName: tx.receiverWallet.user.fullName,
      receiverEmail: tx.receiverWallet.user.email,
      amount: Number(tx.amount),
      note: tx.note,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      idempotencyKey: tx.idempotencyKey,
    }));
  }
}
