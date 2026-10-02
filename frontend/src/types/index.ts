/**
 * Core TypeScript definitions for Mini Secure Fintech Wallet.
 * Maps directly to backend Prisma schema and assignment requirements (FR-1 to FR-9, W1 to W6).
 */

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  cnic?: string;
  accountNumber?: string;
  role?: UserRole;
  isBlocked?: boolean;
}

export interface Wallet {
  id: string;
  userId: string;
  accountNumber?: string;
  balance: number;
  currency: string;
}

export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface Transaction {
  id: string;
  senderWalletId: string;
  senderName: string;
  senderEmail: string;
  receiverWalletId: string;
  receiverName: string;
  receiverEmail: string;
  amount: number;
  note?: string;
  status: TransactionStatus;
  createdAt: string;
  idempotencyKey?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE';
  details?: string;
}

export interface SecurityControlState {
  w1ObjectLevelAuth: boolean;      // W1: Anti-BOLA OwnershipGuard
  w2ServerDerivedSender: boolean;  // W2: Server-Derived Sender Identity
  w3Argon2idHashing: boolean;       // W3: Argon2id Password Hashing Engine
  w4AtomicTransaction: boolean;     // W4: Atomic DB Transactions ($transaction)
  w5IdempotencyKey: boolean;        // W5: Idempotency Key Replay Prevention
  w6AuditLogging: boolean;          // W6: Pino Structured Audit Stream
  w7Aes256Encryption: boolean;      // W7: AES-256-GCM PII DB Encryption at Rest
  w8SantanderBulkExport: boolean;   // W8: Admin Bulk Export Cap (500 rows), DLP & CSV Injection Sanitization
  w9AccountKillSwitch: boolean;     // W9: Real-Time Account Kill-Switch & 2s Session Termination
  w10RateLimitStepUp: boolean;      // W10: Velocity Limiter (3 tx/min) & Step-Up Auth (> 5K PKR)
  w11WebAuthnPasskeys: boolean;     // W11: FIDO2 WebAuthn Biometric Passkeys
  w8WebAuthnPasskeys?: boolean;     // Backward compatibility alias
}
