/**
 * ============================================================================
 * OWNERSHIP GUARD (Security Weakness W1 — Anti-BOLA)
 * ============================================================================
 * What this file does:
 * This guard prevents BOLA (Broken Object Level Authorization) attacks.
 * It checks if the logged-in user (from JWT token) is the REAL owner of the requested account data.
 * 
 * Example Attack Blocked by this code:
 * User A logs in and gets a valid token. User A changes the URL to `/wallet/balance/user-B-id`.
 * This guard compares User A's token `sub` ID with `user-B-id`.
 * Because they don't match, this guard IMMEDIATELY rejects the request with a `403 Forbidden` error.
 * ============================================================================
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../services/audit.service';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Checks if the user making the request owns the requested account data.
   * Addresses Security Weakness W1 (BOLA Prevention).
   * 
   * @param context - NestJS request execution context
   * @returns boolean true if authorized; throws 403 ForbiddenException if unauthorized
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user || !user.sub) {
      throw new ForbiddenException('Unauthenticated user session.');
    }

    // Target user ID specified in URL parameter (e.g., /wallet/balance/:userId)
    const targetUserId = params.userId || params.id;

    if (!targetUserId) {
      return true; // No target user ID in parameter
    }

    // [SECURITY CONTROL W1] Compare JWT subject against target URL parameter
    if (user.sub !== targetUserId) {
      // Log security violation attempt (W6)
      await this.auditService.logEvent(
        'BOLA_ATTEMPT_BLOCKED',
        user.sub,
        'FAILURE',
        request.ip,
        { targetUserId, attemptedPath: request.url }
      );

      throw new ForbiddenException(
        '403 Forbidden: OwnershipGuard rejected unauthorized cross-account operation (W1 BOLA Prevention).'
      );
    }

    return true;
  }
}
