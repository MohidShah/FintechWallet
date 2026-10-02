# 🔐 Mini Secure Fintech Wallet — Academic Security Project

**Course:** Secure System Design (Assignment 1)  
**Architecture:** Desktop Web Application (React + TypeScript + NestJS + Prisma ORM + SQLite)  
**Security Focus:** Threat-to-Control Traceability (W1–W11), Argon2id Hashing, Anti-BOLA, Atomic DB Transactions, Idempotency, Pino Audit Streams, AES-256-GCM Encryption at Rest, Santander Bulk Export Protection, Account Kill-Switch, RateLimiter & Step-Up Auth, FIDO2 WebAuthn Passkeys.

---

## 📌 1. System Overview & Architecture

Mini Secure Fintech Wallet is a full-stack digital wallet application designed to demonstrate core secure-system-design principles (CIA Triad, Least Privilege, Defense in Depth, Authorization, Accountability) within a real web implementation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Desktop Web Dashboard (React + TypeScript)               │
│  (Persistent Sidebar, Available Balance Card, Send Money, Receipt Modal,    │
│   Security Evaluation Demo Panel for Live W1–W11 Control Testing)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST API (Signed JWT Bearer Token)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             NestJS Backend API                              │
│  ├── AuthController / AuthService (Argon2id Hashing [W3], AES-256-GCM [W7]) │
│  ├── WalletController / WalletService (Atomic Transactions [W4])            │
│  ├── Guards: JwtAuthGuard, OwnershipGuard [W1], IdempotencyGuard [W5]      │
│  ├── Anti-Fraud Engine: Velocity Limit (Max 3/min), Step-Up Auth (> 5K PKR) │
│  └── Services: AuditService (Pino Structured Logs [W6])                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Prisma ORM ($transaction)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SQLite Database (dev.db)                        │
│  Tables: users, wallets, transactions, idempotency_keys, audit_logs         │
│  (CNICs encrypted at rest using AES-256-GCM with fresh 12-byte IVs)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 2. Security Design & Traceability Matrix (W1–W11)

| ID | Asset | Identified Weakness | Possible Impact | Proposed Security Control | Code Implementation Location | Before/After Test Result |
|---|---|---|---|---|---|---|
| **W1** | Account & Balance | **BOLA (Cross-account data access):** Accessing another user's wallet by spoofing `:userId` URL params. | Data breach & privacy violation. | Custom `OwnershipGuard` verifying JWT `sub` matches resource owner. | [`backend/src/common/guards/ownership.guard.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/common/guards/ownership.guard.ts) | 🔴 **Before:** Cross-user request returns balance.<br>🟢 **After:** Returns `403 Forbidden`. |
| **W2** | Wallet Balance | **Unauthorized Transfer Initiation:** Client passes spoofed `senderId` in body. | Financial theft / unauthorized debit. | Server-derived sender identity strictly from `req.user.sub` JWT payload. | [`backend/src/wallet/wallet.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/wallet/wallet.service.ts) | 🔴 **Before:** Debit applied to spoofed ID.<br>🟢 **After:** Spoofed ID ignored; caller debited. |
| **W3** | Credentials | **Weak Credential Storage:** Plaintext or weakly hashed passwords. | Account takeover / credential leakage. | **Argon2id** password hashing (`argon2` package) + generic error responses. | [`backend/src/auth/auth.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/auth/auth.service.ts) | 🔴 **Before:** Vulnerable hashes / enumeration.<br>🟢 **After:** Salted Argon2id hash + generic `401`. |
| **W4** | Wallet Balance | **Non-Atomic Transfer Failure:** System crash between debit and credit. | Balance corruption / money creation. | Single atomic database transaction via `prisma.$transaction([])`. | [`backend/src/wallet/wallet.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/wallet/wallet.service.ts) | 🔴 **Before:** Partial state debit.<br>🟢 **After:** Full transaction rollback on failure. |
| **W5** | Balance & Ledger | **Duplicate Transfer Submissions:** Double-submit or network retry. | Double debiting sender balance. | Client UUID `Idempotency-Key` header tracking and cached response return. | [`backend/src/wallet/wallet.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/wallet/wallet.service.ts) | 🔴 **Before:** Multiple debits created.<br>🟢 **After:** Original result cached & returned. |
| **W6** | Audit Logs | **Lack of Accountability:** Unrecorded logins or transfers. | Inability to perform post-incident audit. | Structured JSON logging via **Pino** (`nestjs-pino`) with redacted secrets. | [`backend/src/common/services/audit.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/common/services/audit.service.ts) | 🔴 **Before:** Unrecorded security events.<br>🟢 **After:** Structured log stream + DB audit trail. |
| **W7** | Customer PII | **Plaintext PII Storage at Rest:** Unencrypted CNICs in database file. | Mass identity theft on database backup leak. | **AES-256-GCM** Field Encryption (12-byte IV) at rest + Display-time DLP Masking (`42101-******12-1`). | [`backend/src/common/utils/crypto.util.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/common/utils/crypto.util.ts) | 🔴 **Before:** Cleartext CNIC in DB.<br>🟢 **After:** AES-256 ciphertext in DB & DLP UI. |
| **W8** | Global Data Ledger | **Unrestricted Admin Bulk Data Exfiltration:** Mass customer data exports. | Mass data breach (Santander breach pattern). | ADMIN role check, 500-row volume cap, DLP masking & CSV formula injection sanitization. | [`frontend/src/components/views/AdminView.tsx`](file:///d:/New%20folder/FintechWalletApp/frontend/src/components/views/AdminView.tsx) | 🔴 **Before:** Unrestricted bulk CSV download.<br>🟢 **After:** 500-row cap + DLP + Formula sanitization. |
| **W9** | User Session | **Lack of Instant Account Kill-Switch:** Blocked account active until JWT exp (15m). | Unauthorized fund transfers during active window. | DB `status` column with real-time 2s polling session watcher forcing client logout. | [`frontend/src/context/AuthContext.tsx`](file:///d:/New%20folder/FintechWalletApp/frontend/src/context/AuthContext.tsx) | 🔴 **Before:** Active JWT valid for 15m.<br>🟢 **After:** Session terminated in < 2 seconds. |
| **W10** | Transfer Engine | **Velocity Flooding & High-Value Single-Factor Theft:** Rapid bot transfers. | System liquidity drain & high-value theft. | NestJS RateLimiter (max 3 req/min) & Step-Up Password Auth for transfers > PKR 5,000. | [`backend/src/wallet/wallet.controller.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/wallet/wallet.controller.ts) | 🔴 **Before:** Rapid flood & single-factor theft.<br>🟢 **After:** Rate limited + Step-Up Auth prompt. |
| **W11** | Auth Credentials | **Single-Factor Password Vulnerability:** Phishing, keylogging, credential stuffing. | Account takeover via captured credentials. | **WebAuthn FIDO2 Biometric Passkeys** (`@simplewebauthn`) for hardware passwordless login. | [`backend/src/auth/auth.service.ts`](file:///d:/New%20folder/FintechWalletApp/backend/src/auth/auth.service.ts) | 🔴 **Before:** Password-only authentication.<br>🟢 **After:** Phishing-resistant biometric passkeys. |

---

## 🚀 3. How to Run Locally (Step-by-Step)

### Prerequisites
* **Node.js** v18+ (Check with `node -v`)
* **npm** v9+ (Check with `npm -v`)

> [!NOTE]
> **`node_modules` folders are NOT included** in this submission to keep the archive size small (~2 MB instead of ~800 MB).  
> They are auto-generated and must be installed before running the app (see Steps 1 & 2 below).  
> The `.gitignore` file at the project root intentionally excludes `node_modules/`, `dist/`, and `.env` files.

---

### Step 1: Start Backend API (NestJS + SQLite Database)

Open terminal in the project directory:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install backend dependencies
npm install

# 3. Generate Prisma Client
npx prisma generate

# 4. Sync SQLite Database schema (dev.db)
npx prisma db push

# 5. Initialize/Seed default System Admin account
npx ts-node prisma/seed.ts

# 6. Start NestJS Backend API Server (Watch Mode)
npm run dev
```

* Backend API will run on **`http://localhost:3000`**

---

### Step 2: Start Frontend Web Dashboard (React + Vite)

Open a **second terminal window** in the project directory:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Start Vite Frontend Dev Server
npm run dev
```

* Frontend Application will run on **`http://localhost:5173`**

---

### Step 3: Launch Prisma Studio Database GUI (Optional)

Open a **third terminal window** in the `backend` directory:

```bash
cd backend
npx prisma studio
```

* Prisma Studio database GUI will open on **`http://localhost:5555`**
* Allows direct inspection of raw SQLite tables (`users`, `wallets`, `transactions`, `idempotency_keys`, `audit_logs`).

---

## 🔑 4. Demo Login Credentials

### 1. System Administrator Account (Full Security Oversight)
* **Email:** `admin@securewallet.io`
* **Password:** `Password123!`
* **Access Features:** Admin Security Oversight Panel, System Liquidity KPI, User Directory, Pino Audit Logs, Global Ledger, Threat-to-Control Traceability Matrix.

### 2. Customer Account Registration
* Click **Create Account** on the login screen (`http://localhost:5173`).
* Enter Full Name, Email, Username, CNIC (`42101-1234567-1` auto-formatted), and Password.
* Upon registration, a welcome balance of **1,000,000 PKR** and a unique **Wallet IBAN** (`PK99SWAL...`) are assigned automatically.

---

## 🧪 5. Interactive Security Evaluation Panel

The web dashboard features an interactive **SECURITY EVALUATION DEMO PANEL** fixed at the top of the screen. Evaluators can toggle any control between **BEFORE (Vulnerable)** and **AFTER (Protected)** to test security behaviors in real-time:

1. **W1 (BOLA Guard):** Toggle OFF to observe cross-account balance retrieval; toggle ON to verify `403 Forbidden`.
2. **W2 (Sender Identity):** Toggle OFF to test client-supplied sender spoofing; toggle ON to verify server-derived JWT identity.
3. **W3 (Argon2id Hashing):** Inspect password hashes in database/Prisma Studio to verify salted Argon2id memory cost 64MB.
4. **W4 (Atomic Transactions):** Verify `$transaction` block ensuring debit and credit succeed or fail as 1 atomic unit.
5. **W5 (Idempotency Replay):** Test duplicate transfer submissions using identical `Idempotency-Key` headers to observe cached response return.
6. **W6 (Pino Audit Trail):** View structured JSON log stream in Admin Panel and Profile Audit Trail.
7. **W7 (AES-256-GCM Encryption at Rest):** Inspect Prisma Studio `cnic` column to verify ciphertext (`enc:v1:7a8b9c...`) vs. UI DLP Masking (`42101-******12-1`).
8. **W8 (Santander Bulk Export Guard):** Test Admin bulk CSV export role check, 500-row volume cap, DLP masking, and formula injection sanitization.
9. **W9 (Account Kill-Switch):** Toggle admin block on active user; verify client 2s session watcher forces instant logout.
10. **W10 (RateLimiter & Step-Up Auth):** Verify velocity limit (max 3 tx/min) and password re-prompt for transfers > PKR 5,000.
11. **W11 (WebAuthn / FIDO2 Passkeys):** Register hardware biometrics (Touch ID / Windows Hello) under Profile -> Security Controls and log in passwordlessly with `@simplewebauthn`.

---

## 📦 6. Before Submitting / Uploading

> [!CAUTION]
> The `node_modules` folders are **NOT** meant to be uploaded. They are auto-generated and can balloon the project size from **~2 MB to ~800 MB**.

Run the following commands from the **project root** to safely delete them before zipping:

**Windows (PowerShell) — Safe with existence check:**
```powershell
@('backend\node_modules', 'frontend\node_modules') | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Recurse -Force $_
        Write-Host "Deleted: $_" -ForegroundColor Green
    } else {
        Write-Host "Already removed or not found: $_" -ForegroundColor Yellow
    }
}
Write-Host "Safe to zip and upload!" -ForegroundColor Cyan
```

**macOS / Linux (bash) — Safe with existence check:**
```bash
for dir in backend/node_modules frontend/node_modules; do
  if [ -d "$dir" ]; then
    rm -rf "$dir" && echo "Deleted: $dir"
  else
    echo "Already removed or not found: $dir"
  fi
done
echo "Safe to zip and upload!"
```

> [!TIP]
> These scripts will **not error** if `node_modules` is already missing — safe to run multiple times.

After deleting, zip the folder and upload. The evaluator can restore dependencies with:

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

---

