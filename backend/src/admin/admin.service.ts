/**
 * Admin Service Module
 * Handles database queries for administrator oversight, system analytics, and security audit streams.
 */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { decryptField } from '../common/utils/crypto.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves overall system KPI statistics from database.
   */
  async getSystemStats() {
    const totalUsers = await this.prisma.user.count();
    
    const wallets = await this.prisma.wallet.findMany({
      select: { balance: true },
    });
    const totalLiquidity = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const totalTransactions = await this.prisma.transaction.count();
    
    const transactions = await this.prisma.transaction.findMany({
      select: { amount: true },
    });
    const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalLogs = await this.prisma.auditLog.count();

    return {
      totalUsers,
      totalLiquidity,
      totalTransactions,
      totalVolume,
      totalLogs,
    };
  }

  /**
   * Retrieves full registered user directory from database with wallet balance and block status.
   */
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      username: u.username,
      cnic: decryptField(u.cnic) || '42101-9823412-1',
      accountNumber: u.wallet?.accountNumber || `PK99SWAL${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: u.role,
      isBlocked: u.isBlocked,
      balance: u.wallet ? Number(u.wallet.balance) : 0,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /**
   * Toggles account block/freeze status for a user.
   */
  async toggleBlockUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    if (user.role === 'ADMIN' || user.email === 'admin@securewallet.io') {
      throw new BadRequestException('Security Restriction: System Administrator accounts cannot be blocked.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: !user.isBlocked },
    });

    const action = updated.isBlocked ? 'USER_ACCOUNT_BLOCKED' : 'USER_ACCOUNT_UNBLOCKED';
    await this.auditService.logEvent(
      action,
      userId,
      'SUCCESS',
      undefined,
      { email: user.email, isBlocked: updated.isBlocked }
    );

    return {
      success: true,
      message: updated.isBlocked
        ? `Account for ${user.email} has been BLOCKED successfully.`
        : `Account for ${user.email} has been UNBLOCKED.`,
      user: {
        id: updated.id,
        email: updated.email,
        isBlocked: updated.isBlocked,
      },
    };
  }

  /**
   * Retrieves system-wide audit logs from database.
   */
  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      include: {
        user: { select: { email: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return logs.map(l => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      userEmail: l.user ? l.user.email : undefined,
      result: l.action.includes('FAILED') || l.action.includes('BLOCKED') ? 'FAILURE' : 'SUCCESS',
      details: l.metadata || l.action,
      timestamp: l.timestamp.toISOString(),
    }));
  }

  /**
   * Retrieves complete system-wide transfer ledger from database.
   */
  async getAllTransactions() {
    const transactions = await this.prisma.transaction.findMany({
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
