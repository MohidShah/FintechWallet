/**
 * JWT Authentication Guard
 * Protects routes requiring authenticated session context (FR-2).
 * Verifies Bearer JWT tokens using Passport Strategy.
 */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required. Please provide a valid Bearer JWT token.');
    }
    return user;
  }
}
