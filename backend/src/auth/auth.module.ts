/**
 * ============================================================================
 * AUTH MODULE (Authentication Configuration)
 * ============================================================================
 * What this file does:
 * This file bundles together everything needed for User Authentication (Sign up & Login).
 * It connects the AuthController, AuthService, JWT Token generator, and Passport strategy.
 * 
 * Why it exists:
 * NestJS uses modules to organize code. This module handles user logins, password hashing,
 * and token creation for FR-1, FR-2, and Security Weakness W3.
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WebAuthnController } from './webauthn.controller';
import { WebAuthnService } from './webauthn.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [
    // Connects to database via Prisma
    PrismaModule,
    // Enables Passport authentication helpers
    PassportModule,
    // Configures JWT (JSON Web Token) creation with a secret key and 24-hour expiration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-fintech-jwt-key-2026',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController, WebAuthnController],
  providers: [AuthService, WebAuthnService, JwtStrategy, AuditService],
  exports: [AuthService, WebAuthnService],
})
export class AuthModule {}
