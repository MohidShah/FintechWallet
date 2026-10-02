/**
 * Idempotency Guard Module
 * Addresses W5 (Duplicate Transfers / Replay Attack Prevention).
 * Checks the Idempotency-Key header against stored execution records.
 * If key was previously processed, returns cached response to prevent duplicate transfer creation.
 */
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../services/audit.service';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Checks request idempotency key against processed records.
   * Addresses W5 (Idempotency).
   * 
   * @param context - NestJS execution context
   * @returns boolean true if request can proceed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      // Idempotency key mandatory on transfer endpoints
      throw new BadRequestException('Validation Error: Idempotency-Key header is required for fund transfers (W5).');
    }

    const userId = request.user?.sub || 'ANONYMOUS';

    // Search stored idempotency keys (W5)
    const existingRecord = await this.prisma.idempotencyKey.findUnique({
      where: { key: String(idempotencyKey) },
    });

    if (existingRecord) {
      await this.auditService.logEvent(
        'TRANSFER_IDEMPOTENT_REPLAY_CAUGHT',
        userId,
        'SUCCESS',
        request.ip,
        { key: idempotencyKey }
      );

      // Intercept request & return stored cached response directly (W5 Idempotency Control)
      const parsedBody = JSON.parse(existingRecord.responseBody);
      response.status(existingRecord.statusCode).json({
        ...parsedBody,
        _idempotencyNote: 'Idempotent response: This request was previously processed (W5 Control).',
      });

      return false; // Stop further handler execution
    }

    return true;
  }
}
