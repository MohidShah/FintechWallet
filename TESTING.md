# 🧪 Evaluator Security Testing Guide — Mini Secure Fintech Wallet

**Course:** Secure System Design (Assignment 1)  
**Authors:** Syed Mohid Ul Hassan (26I-7709) & Muhammad Akash Afzal (26I-7807)  
**Target Application:** Full-Stack Desktop Web App (React 18 + TypeScript + NestJS + Prisma ORM + SQLite)

---

## 📌 1. Environment & Demo Access Details

| Component | URL / Location | Credentials / Access |
|---|---|---|
| **Web Dashboard (React SPA)** | **`http://localhost:5173`** | `admin@securewallet.io` / `Password123!` (or register customer) |
| **Backend REST API (NestJS)** | **`http://localhost:3000`** | Signed JWT Bearer Token |
| **Prisma Studio Database GUI** | **`http://localhost:5555`** | Direct SQLite (`dev.db`) Table Inspection |

---

## 🧪 2. How to Use the Interactive Security Demo Panel

1. Open **`http://localhost:5173`** in your web browser.
2. Log in using System Admin credentials or create a customer account.
3. Locate the **SECURITY EVALUATION DEMO PANEL** fixed at the top of the screen.
4. Click the panel bar to expand all **W1–W11 Security Control Toggles**:
   - 🔴 **OFF (Red / Vulnerable)**: Simulates the system **BEFORE** security control implementation.
   - 🟢 **ON (Green / Protected)**: Enables the system **AFTER** security control implementation.

---

## 🛡️ 3. Step-by-Step Test Guide per Security Control (W1–W11)

### W1: Broken Object-Level Authorization (BOLA)
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W1 (BOLA)`** to **OFF (Red)** in top panel.
  2. Open Browser Console (`F12` -> Console) while logged in as Admin (`usr-admin-001`) and run:
     ```javascript
     fetch('http://localhost:3000/wallet/balance/usr-sara-102', {
       headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
     }).then(r => r.json()).then(console.log);
     ```
  3. **Observed Result**: Server returns Sara's private balance without checking account ownership.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W1 (BOLA)`** to **ON (Green)** in top panel.
  2. Re-run the same `fetch` command in the console.
  3. **Observed Result**: Backend returns **`403 Forbidden`**:
     `"403 Forbidden: OwnershipGuard rejected unauthorized cross-account operation (W1 BOLA Prevention)."`

---

### W2: Client-Supplied Sender Identity Spoofing
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W2 (Sender Spoofing)`** to **OFF (Red)**.
  2. Send a transfer passing a spoofed `senderId: "usr-sara-102"` in the HTTP request body.
  3. **Observed Result**: Funds are debited from Sara's account ID based on client body payload.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W2 (Sender Spoofing)`** to **ON (Green)**.
  2. Re-submit the transfer request.
  3. **Observed Result**: Body `senderId` is ignored; server derives sender identity strictly from `req.user.sub` in verified JWT payload and debits caller's account.

---

### W3: Argon2id Credential Hashing & Anti-Enumeration
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W3 (Weak Password)`** to **OFF (Red)**.
  2. Passwords stored as plaintext or weak MD5 hashes vulnerable to instant GPU cracking.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W3 (Weak Password)`** to **ON (Green)**.
  2. Open Prisma Studio (`http://localhost:5555`) -> `users` table -> inspect `passwordHash` column.
  3. **Observed Result**: Passwords stored as salted Argon2id hashes (`$argon2id$v=19$m=65536,t=3,p=1...`) requiring 64MB memory per hash attempt.
  4. Attempt login with wrong password (`wrongpass123`) -> Observe generic `401 Unauthorized` anti-enumeration message: `"Invalid credentials. Please verify your email and password."`

---

### W4: Non-Atomic Database Transactions (`$transaction`)
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W4 (Non-Atomic)`** to **OFF (Red)**.
  2. Simulate mid-transfer server crash between debit and credit queries.
  3. **Observed Result**: Partial state failure where sender is debited, but receiver never credited (money creation/loss).
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W4 (Non-Atomic)`** to **ON (Green)**.
  2. Execute a money transfer.
  3. **Observed Result**: `prisma.$transaction([])` wraps debit, credit, and transaction creation in an atomic block; any failure rolls back all state changes completely.

---

### W5: Duplicate Request Replay (Idempotency Key)
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W5 (Replay/Duplicate)`** to **OFF (Red)**.
  2. Submit transfer and rapidly double-click **Send Money** or resubmit identical `Idempotency-Key` header.
  3. **Observed Result**: Two separate transactions execute, double-debiting sender balance.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W5 (Replay/Duplicate)`** to **ON (Green)**.
  2. Resubmit identical transfer with same `Idempotency-Key` header.
  3. **Observed Result**: `IdempotencyGuard` catches duplicate key, skips re-debiting, and returns cached original response.

---

### W6: Pino Structured Security Audit Stream
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W6 (Accountability)`** to **OFF (Red)**.
  2. Perform login/transfers -> Unrecorded state changes with no log stream created.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W6 (Accountability)`** to **ON (Green)**.
  2. Perform logins, transfers, or export actions.
  3. Go to **Admin Panel -> Audit Stream** tab.
  4. **Observed Result**: Structured JSON logs (`AUTH_LOGIN_SUCCESS`, `TRANSFER_SUCCESS`) emitted with timestamps, user IDs, IP addresses, and redacted secrets.

---

### W7: AES-256-GCM Field Encryption & DLP Masking
* **🔴 BEFORE Test (Vulnerable)**:
  1. Open Prisma Studio (`http://localhost:5555`) -> `users` table.
  2. Cleartext CNIC numbers visible (`42101-1234567-1`).
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W7 (Data Confidentiality)`** to **ON (Green)**.
  2. Refresh Prisma Studio `users` table -> `cnic` column displays AES-256-GCM ciphertext (`enc:v1:d309db...`).
  3. On Web Dashboard header, click **DLP Masked (Control #15)** button -> UI displays DLP masked format (`42101-******12-1`).

---

### W8: Santander Admin Bulk Export Protection
* **🔴 BEFORE Test (Vulnerable)**:
  1. Unrestricted bulk CSV download of raw database tables without volume caps or formula injection protection.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W8 (Bulk Data Exfiltration)`** to **ON (Green)**.
  2. Go to **Admin Panel -> Global Ledger** tab -> Click **Export Ledger CSV**.
  3. **Observed Result**:
     - Export is capped at **500 records**.
     - Emails and CNICs are DLP masked.
     - Executable cells (`=`, `+`, `-`, `@`) are sanitized with single quotes `'` to prevent Excel macro execution.
     - Immutable audit log `ADMIN_EXPORT_GLOBAL_LEDGER_SUCCESS` is generated.

---

### W9: Account Kill-Switch & 2s Session Logout Watcher
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W9 (Kill-Switch)`** to **OFF (Red)**.
  2. Block user account in database while user is logged in.
  3. **Observed Result**: User remains logged in and can continue transferring money until 15-minute JWT expires.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W9 (Kill-Switch)`** to **ON (Green)**.
  2. Open customer account in Browser Window 1. Open Admin Panel in Browser Window 2 and click **Block Account**.
  3. **Observed Result**: Within **2 seconds**, client active session watcher detects status `BLOCKED` and forces immediate logout.

---

### W10: Transfer Velocity Limiter & Step-Up Auth
* **🔴 BEFORE Test (Vulnerable)**:
  1. Toggle **`W10 (Velocity & Risk)`** to **OFF (Red)**.
  2. Submit 10 transfers/second or execute PKR 50,000 transfer.
  3. **Observed Result**: Transfers process rapidly without rate limit or extra auth prompt.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W10 (Velocity & Risk)`** to **ON (Green)**.
  2. **Velocity Test**: Submit 4 transfers within 1 minute -> 4th request blocked with `429 Too Many Requests` (Max 3 req/min).
  3. **Step-Up Auth Test**: Initiate transfer > PKR 5,000 -> Step-Up Password Modal pops up demanding password re-verification before processing.

---

### W11: FIDO2 WebAuthn Hardware Biometric Passkeys
* **🔴 BEFORE Test (Vulnerable)**:
  1. Password-only authentication vulnerable to keyloggers and credential stuffing.
* **🟢 AFTER Test (Protected)**:
  1. Toggle **`W11 (Passkeys)`** to **ON (Green)**.
  2. Go to **Profile -> Security Controls -> Register Passkey**.
  3. Authenticate using Touch ID / Windows Hello / YubiKey.
  4. Log out -> Click **Sign in with Passkey** on login screen -> Authenticate with hardware biometric key to log in passwordlessly.

---

## 🚀 4. How to Run Locally

### Terminal 1: Backend API (NestJS + SQLite)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
```

### Terminal 2: Frontend Dashboard (React 18 + Vite)
```bash
cd frontend
npm install
npm run dev
```

### Terminal 3: Database Inspection GUI (Prisma Studio)
```bash
cd backend
npx prisma studio
```
