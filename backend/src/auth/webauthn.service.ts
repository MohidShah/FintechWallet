/**
 * ============================================================================
 * WEBAUTHN / FIDO2 PASSKEY SERVICE (Bonus Multi-Factor Authentication Control)
 * ============================================================================
 * Provides FIDO2 WebAuthn Passkey Registration & Verification using W3C standards
 * and `@simplewebauthn/server` package.
 * 
 * Works seamlessly on `localhost` (browsers treat localhost as a Secure Context).
 * ============================================================================
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';

const RP_NAME = 'Mini Secure Fintech Wallet';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

// Temporary challenge store (in-memory for active sessions)
const userChallenges = new Map<string, string>();

@Injectable()
export class WebAuthnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 1. Generate WebAuthn Passkey Registration Options
   */
  async generateRegistrationOptions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const userAuthenticators = user.authenticators.map(auth => ({
      id: auth.credentialID,
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    }));

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.fullName,
      attestationType: 'none',
      excludeCredentials: userAuthenticators,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    };

    const options = await generateRegistrationOptions(opts);
    userChallenges.set(user.id, options.challenge);

    return options;
  }

  /**
   * 2. Verify WebAuthn Passkey Registration Response & Store Credential
   */
  async verifyRegistration(userId: string, body: any) {
    const expectedChallenge = userChallenges.get(userId);
    if (!expectedChallenge) {
      throw new BadRequestException('WebAuthn registration challenge expired or missing.');
    }

    const opts: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    };

    let verification;
    try {
      verification = await verifyRegistrationResponse(opts);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'WebAuthn passkey registration verification failed.');
    }
    userChallenges.delete(userId);

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      await this.prisma.authenticator.create({
        data: {
          userId,
          credentialID: credential.id,
          credentialPublicKey: Buffer.from(credential.publicKey).toString('base64'),
          counter: BigInt(credential.counter),
          credentialDeviceType: credentialDeviceType || (credential as any).deviceType || 'singleDevice',
          credentialBackedUp: credentialBackedUp ?? (credential as any).backedUp ?? false,
          transports: credential.transports ? JSON.stringify(credential.transports) : null,
        },
      });

      await this.auditService.logEvent(
        'WEBAUTHN_PASSKEY_REGISTERED',
        userId,
        'SUCCESS',
        undefined,
        { credentialId: credential.id }
      );

      return { verified: true, message: 'WebAuthn Passkey registered successfully!' };
    }

    throw new BadRequestException('Passkey registration verification failed.');
  }

  /**
   * 3. Generate WebAuthn Authentication Options for Login / Step-Up
   */
  async generateAuthenticationOptions(userEmail?: string) {
    let userAuthenticators: any[] = [];
    let userId = 'anonymous';

    if (userEmail) {
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() },
        include: { authenticators: true },
      });
      if (user && user.authenticators.length > 0) {
        userId = user.id;
        userAuthenticators = user.authenticators.map(auth => ({
          id: auth.credentialID,
          transports: auth.transports ? JSON.parse(auth.transports) : undefined,
        }));
      }
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID: RP_ID,
      allowCredentials: userAuthenticators,
      userVerification: 'preferred',
    };

    const options = await generateAuthenticationOptions(opts);
    userChallenges.set(userId, options.challenge);

    return options;
  }

  /**
   * 4. Verify WebAuthn Authentication Response & Issue JWT Token
   */
  async verifyAuthentication(body: any) {
    const credentialID = body.id;
    const authenticator = await this.prisma.authenticator.findUnique({
      where: { credentialID },
      include: { user: true },
    });

    if (!authenticator) {
      throw new BadRequestException('Passkey authenticator credential not found. Please register your biometric passkey under Profile first.');
    }

    if (authenticator.user.isBlocked) {
      await this.auditService.logEvent(
        'WEBAUTHN_AUTH_BLOCKED_ACCOUNT',
        authenticator.userId,
        'FAILURE',
        undefined,
        { credentialId: credentialID }
      );
      throw new BadRequestException('Account Blocked: Your account has been suspended by the Security Officer. Please contact support.');
    }

    const expectedChallenge = userChallenges.get(authenticator.userId) || userChallenges.get('anonymous');
    if (!expectedChallenge) {
      throw new BadRequestException('Authentication challenge expired or invalid.');
    }

    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticator.credentialID,
        publicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
        counter: Number(authenticator.counter),
      },
      requireUserVerification: false,
    };

    let verification;
    try {
      verification = await verifyAuthenticationResponse(opts);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'WebAuthn passkey authentication failed.');
    }

    userChallenges.delete(authenticator.userId);
    userChallenges.delete('anonymous');

    if (verification.verified) {
      // Update counter
      await this.prisma.authenticator.update({
        where: { id: authenticator.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      const user = authenticator.user;
      const accessToken = this.jwtService.sign({ sub: user.id, email: user.email, username: user.username });

      await this.auditService.logEvent(
        'WEBAUTHN_PASSKEY_AUTH_SUCCESS',
        user.id,
        'SUCCESS',
        undefined,
        { credentialId: authenticator.credentialID }
      );

      return {
        verified: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
        },
        accessToken,
      };
    }

    throw new BadRequestException('WebAuthn Passkey authentication failed.');
  }
}
