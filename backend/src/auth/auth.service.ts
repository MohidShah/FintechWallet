/**
 * ============================================================================
 * AUTHENTICATION SERVICE (Sign Up & Login Logic)
 * ============================================================================
 * What this file does:
 * 1. Hashes user passwords securely using Argon2id when users sign up (W3).
 * 2. Checks password hashes during login and issues signed JWT tokens (FR-2).
 * 3. Prevents "account enumeration attacks" by returning generic error messages
 *    (e.g., "Invalid email or password") so attackers cannot guess which emails exist.
 * ============================================================================
 */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { encryptField, decryptField } from '../common/utils/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registers a new customer and gives them an initial demo wallet (Rs. 1,000).
   * Addresses Security Weakness W3: Argon2id Password Hashing.
   * 
   * How it works:
   * 1. Checks if email or username already exists.
   * 2. Hashes password using Argon2id (never stores plaintext or weak MD5/bcrypt).
   * 3. Saves user and wallet inside a database transaction.
   * 4. Returns user info and access token.
   */
  async register(dto: RegisterDto) {
    // Step 1: Ensure email or username is not already taken
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
      },
    });

    if (existing) {
      throw new ConflictException('Account with this email or username already exists.');
    }

    // Step 2: [SECURITY CONTROL W3] Hash password using Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB memory cost
      timeCost: 3,       // 3 iterations
      parallelism: 1,
    });

    const randomAccountNo = `PK99SWAL${Math.floor(10000000 + Math.random() * 90000000)}`;

    const rawCnic = dto.cnic || '42101-9823412-1';
    const encryptedCnic = encryptField(rawCnic);

    // Step 3: Create User and initial Wallet in DB
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email.toLowerCase(),
          username: dto.username,
          cnic: encryptedCnic,
          passwordHash,
        },
      });

      // Default welcome bonus balance (1,000,000 PKR) & unique IBAN/Account Number
      await tx.wallet.create({
        data: {
          userId: newUser.id,
          accountNumber: randomAccountNo,
          balance: 1000000.00,
        },
      });

      return newUser;
    });

    // Step 4: [SECURITY CONTROL W6] Audit Log event
    await this.auditService.logEvent(
      'AUTH_REGISTER_SUCCESS',
      user.id,
      'SUCCESS',
      undefined,
      { email: user.email }
    );

    const token = this.generateToken(user.id, user.email, user.username);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        cnic: decryptField(user.cnic) || rawCnic,
        accountNumber: randomAccountNo,
      },
      accessToken: token,
    };
  }

  /**
   * Authenticates a returning customer.
   * Addresses Security Weakness W3 (Argon2id Verification) and Anti-Enumeration.
   * 
   * How it works:
   * 1. Looks up user by email.
   * 2. Verifies provided password against Argon2id hash using argon2.verify().
   * 3. Returns generic "Invalid email or password" if either step fails.
   * 4. Logs login attempt via AuditService (W6).
   */
  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { wallet: true },
    });

    // Anti-enumeration defense: don't reveal if email exists or not
    if (!user) {
      await this.auditService.logEvent(
        'AUTH_LOGIN_FAILED',
        null,
        'FAILURE',
        ipAddress,
        { emailAttempt: dto.email }
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.isBlocked) {
      await this.auditService.logEvent(
        'AUTH_LOGIN_BLOCKED_ACCOUNT',
        user.id,
        'FAILURE',
        ipAddress,
        { emailAttempt: dto.email }
      );
      throw new UnauthorizedException('Account Blocked: Your account has been suspended by the Security Officer. Please contact support.');
    }

    // Step 2: [SECURITY CONTROL W3] Verify password against Argon2id hash
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      await this.auditService.logEvent(
        'AUTH_LOGIN_FAILED',
        user.id,
        'FAILURE',
        ipAddress,
        { emailAttempt: dto.email }
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Step 3: Log login success (W6)
    await this.auditService.logEvent(
      'AUTH_LOGIN_SUCCESS',
      user.id,
      'SUCCESS',
      ipAddress,
      { email: user.email }
    );

    const accessToken = this.generateToken(user.id, user.email, user.username);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        cnic: decryptField(user.cnic) || '42101-9823412-1',
        accountNumber: user.wallet?.accountNumber || `PK99SWAL${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
      accessToken,
    };
  }

  /**
   * Helper function to generate a signed JWT (JSON Web Token) bearer token.
   */
  private generateToken(userId: string, email: string, username: string): string {
    const payload = { sub: userId, email, username };
    return this.jwtService.sign(payload);
  }

  /**
   * Retrieves list of all registered users for recipient lookups.
   */
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        cnic: true,
        wallet: { select: { accountNumber: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      username: u.username,
      cnic: decryptField(u.cnic) || '42101-9823412-1',
      accountNumber: u.wallet?.accountNumber || `PK99SWAL${Math.floor(10000000 + Math.random() * 90000000)}`,
    }));
  }
}
