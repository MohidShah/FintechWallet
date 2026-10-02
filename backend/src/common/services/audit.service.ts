/**
 * Audit Service Module
 * Addresses W6 (Structured Audit Logging & Accountability).
 * Logs security-relevant actions (logins, transfers, authorization blocks) via Pino JSON logger.
 * Excludes sensitive data (passwords, JWT secrets, full credit cards).
 */
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditActionResult = 'SUCCESS' | 'FAILURE';

@Injectable()
export class AuditService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext('AuditService');
  }

  /**
   * Logs a security audit event to structured Pino logs and persistent database audit_logs table.
   * Addresses W6 (Structured Audit Logging).
   * 
   * @param action - Unique security event identifier (e.g. "AUTH_LOGIN_SUCCESS", "TRANSFER_EXECUTE")
   * @param userId - Optional ID of the user performing the action
   * @param result - Outcome status ("SUCCESS" or "FAILURE")
   * @param ipAddress - Optional client IP address
   * @param metadata - Additional sanitized metadata context
   */
  async logEvent(
    action: string,
    userId: string | null,
    result: AuditActionResult,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // 1. Log via Pino structured JSON logger (W6)
    this.logger.info({
      auditEvent: {
        action,
        userId: userId || 'ANONYMOUS',
        result,
        ipAddress: ipAddress || 'UNKNOWN',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        timestamp,
      },
    }, `[AUDIT W6] ${action} - Result: ${result}`);

    // 2. Persist to audit_logs database table (FR-9)
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          ipAddress: ipAddress || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      // Prevent audit db failure from breaking main operation, but log error
      this.logger.error({ error: err }, 'Failed to persist audit log to DB');
    }
  }
}
