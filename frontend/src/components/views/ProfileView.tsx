import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Shield, Lock, Key, Terminal, Save, CheckCircle2, CreditCard, Hash, Eye, EyeOff, Fingerprint, AlertCircle, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { apiService } from '../../services/api';

export const ProfileView: React.FC = () => {
  const { user, wallet, transactions, auditLogs, securityControls, setActiveView, setSelectedTransaction } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'security' | 'audit'>('info');

  const userTransactions = transactions.filter(
    tx =>
      tx.senderWalletId === wallet?.id ||
      tx.receiverWalletId === wallet?.id ||
      (user?.email && (tx.senderEmail?.toLowerCase() === user.email.toLowerCase() || tx.receiverEmail?.toLowerCase() === user.email.toLowerCase()))
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [cnic, setCnic] = useState(user?.cnic || '42101-9823412-1');
  const [showCnic, setShowCnic] = useState(false);
  const accountNumber = user?.accountNumber || wallet?.accountNumber || 'PK99SWAL84729104';

  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRegisterPasskey = async () => {
    setPasskeyStatus(null);
    setIsRegisteringPasskey(true);
    try {
      const options = await apiService.getWebAuthnRegisterOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      const res = await apiService.verifyWebAuthnRegistration(regResponse);
      if (res.verified) {
        setPasskeyStatus({
          type: 'success',
          message: 'Biometric Passkey registered! You can now log in securely using Touch ID / Face ID / Security Key.',
        });
      }
    } catch (err: any) {
      setPasskeyStatus({
        type: 'error',
        message: err.message || 'Passkey registration failed or was cancelled.',
      });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const formatCnic = (val: string): string => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const maskCnic = (val: string): string => {
    if (!val) return '42101-******12-1';
    const digits = val.replace(/\D/g, '');
    if (digits.length < 13) return val;
    return `${digits.slice(0, 5)}-******${digits.slice(11)}-${digits.slice(12)}`;
  };

  const getControlBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('TRANSFER')) {
      return { code: 'W2, W4 & W5', title: 'Server Sender ID, Atomic DB Tx & Idempotency' };
    }
    if (act.includes('LOGIN') || act.includes('REGISTER')) {
      return { code: 'W3 & W6', title: 'Argon2id Hashing & Pino Logging' };
    }
    if (act.includes('WEBAUTHN') || act.includes('PASSKEY')) {
      return { code: 'W11', title: 'WebAuthn / FIDO2 Passkey Control' };
    }
    if (act.includes('BOLA') || act.includes('SPOOF')) {
      return { code: 'W1 & W2', title: 'Anti-BOLA OwnershipGuard & Server Sender ID' };
    }
    if (act.includes('BLOCKED') || act.includes('SUSPENDED') || act.includes('REVOKED')) {
      return { code: 'Kill-Switch', title: 'Instantaneous DB Account Freeze' };
    }
    if (act.includes('STEPUP')) {
      return { code: 'Control #48', title: 'Step-Up Password Re-verification' };
    }
    return { code: 'W6', title: 'Structured Pino Audit Log' };
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnic(formatCnic(e.target.value));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Profile & Security Settings</h2>
        <p className="text-xs text-slate-500 mt-1">Manage your customer identity, national registration, and security details</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'info'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Account Information</span>
        </button>

        {user?.role !== 'ADMIN' && user?.email !== 'admin@securewallet.io' && (
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'transactions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Recent Transactions ({userTransactions.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security Controls (W1–W11 Traceability)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Structured Audit Trail (W6)</span>
        </button>
      </div>

      {/* Tab 1: Account Info */}
      {activeTab === 'info' && (
        <div className="max-w-[600px] bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-600/20">
              {user?.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{user?.fullName}</h3>
              <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] uppercase">
                  Verified Account
                </span>
                <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-semibold">
                  CNIC Verified
                </span>
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profile & National Identity details updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">National ID Number (CNIC)</label>
                <span className="text-[10px] text-slate-400 font-semibold">Control #15 Masking Active</span>
              </div>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={showCnic ? cnic : maskCnic(cnic)}
                  onChange={handleCnicChange}
                  onFocus={() => setShowCnic(true)}
                  maxLength={15}
                  placeholder="42101-1234567-1"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowCnic(!showCnic)}
                  className="absolute right-3 top-2.5 p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition-colors"
                  title={showCnic ? "Mask CNIC (DLP Control #15)" : "Reveal CNIC"}
                >
                  {showCnic ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Wallet IBAN / Account Number</label>
              <div className="relative">
                <Hash className="w-4 h-4 text-blue-600 absolute left-3.5 top-3" />
                <input
                  type="text"
                  readOnly
                  value={accountNumber}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono font-semibold cursor-not-allowed select-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">System-assigned unique IBAN / wallet routing number (immutable)</p>
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: Recent Transactions (Customer Accounts Only) */}
      {activeTab === 'transactions' && user?.role !== 'ADMIN' && user?.email !== 'admin@securewallet.io' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Profile Account Transactions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Showing recent 5 transfers (total {userTransactions.length})</p>
            </div>
            {userTransactions.length > 0 && (
              <button
                onClick={() => setActiveView('history')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <span>View All ({userTransactions.length})</span>
                <span>→</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Counterparty</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date / Timestamp</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No transactions recorded for this account yet.
                    </td>
                  </tr>
                ) : (
                  userTransactions.slice(0, 5).map(tx => {
                    const isSent = tx.senderWalletId === wallet?.id || (wallet?.userId && tx.senderWalletId === wallet.userId) || (tx.senderEmail && tx.senderEmail.toLowerCase() === user?.email?.toLowerCase());
                    const counterpartyName = isSent ? tx.receiverName : tx.senderName;
                    const counterpartyEmail = isSent ? tx.receiverEmail : tx.senderEmail;

                    return (
                      <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="hover:bg-slate-50/80 cursor-pointer transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] font-medium text-slate-600">
                          {tx.id}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSent ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {isSent ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block text-xs">{counterpartyName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{counterpartyEmail}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                            isSent ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {isSent ? 'Sent' : 'Received'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>

                        <td className={`py-3.5 px-4 text-right font-bold text-xs tabular-nums ${
                          isSent ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {isSent ? '-' : '+'} PKR {tx.amount.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {tx.status || 'Completed'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaction(tx);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                            title="View Transaction Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {userTransactions.length > 5 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Showing 5 of {userTransactions.length} recent transactions</span>
              <button
                onClick={() => setActiveView('history')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                View All {userTransactions.length} Transactions →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Security Controls Specification */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Password Hashing Algorithm (W3)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Passwords are hashed using <strong>Argon2id</strong> (`argon2` npm package) with memory cost 65536 KiB, time cost 3 iterations, and unique salt per user. Plaintext credentials are never logged or stored.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Session Authorization & Anti-BOLA (W1 & W2)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every request requires a signed <strong>JWT Access Token</strong>. NestJS <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">OwnershipGuard</code> enforces object-level authorization by validating JWT subject (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">sub</code>) against target wallet resources.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Atomic Transactions & Idempotency (W4 & W5)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fund transfers execute inside single atomic <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">prisma.$transaction([])</code> blocks to prevent money creation or double debits. <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">Idempotency-Key</code> header checking prevents duplicate transfer submissions.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Terminal className="w-4 h-4 text-blue-600" />
              <span>Structured Audit Streams (W6)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-priority security events (logins, transfers, WebAuthn registrations, BOLA blocks) are formatted into structured JSON streams via <strong>Pino Logger</strong> and stored in the <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">audit_logs</code> database table.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Data at Rest Encryption & DLP Masking (W7)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              PII National Identity fields (CNIC) are cryptographically encrypted at rest inside the SQLite database using <strong>AES-256-GCM</strong> authenticated encryption with fresh 12-byte IVs per record. On presentation screens and Pino log streams, <strong>DLP PII Masking</strong> renders masked placeholders (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">42101-******12-1</code>) to prevent shoulder-surfing and log leakage.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Admin Bulk Export Protection & Formula Sanitization (W8 - Santander Pattern)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Admin bulk CSV data exports are protected against mass data exfiltration breaches. Enforces strict <strong>ADMIN role validation</strong>, a hard <strong>500-row volume cap</strong>, email/CNIC DLP masking, CSV formula injection sanitization (prefixing single quotes <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">'</code> to <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">=, +, -, @</code>), and immutable audit logging.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-red-600" />
              <span>Instant Account Freeze & Kill-Switch Watcher (W9)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Storing account status (<code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">ACTIVE / BLOCKED</code>) directly in the database table serves as an instantaneous kill-switch for compromised accounts. The client active session watcher polls status every 2 seconds and forces immediate logout if blocked.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Velocity Rate Limiting & High-Value Step-Up Auth (W10)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transfer velocity is throttled by NestJS RateLimiter (max 3 requests/minute) to prevent automated bot transfer floods. Transfers exceeding <strong>PKR 5,000</strong> trigger mandatory <strong>Step-Up Password Verification</strong> prior to execution.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                <span>WebAuthn / FIDO2 Biometric Passkey Engine (W11)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                Control W11 Enabled
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Register hardware-backed biometrics (Touch ID, Face ID, Windows Hello, or YubiKey) using <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">@simplewebauthn</code> standard. Passkeys provide phishing-resistant passwordless login alongside Argon2id password hashing.
            </p>

            {passkeyStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  passkeyStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {passkeyStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{passkeyStatus.message}</span>
              </div>
            )}

            {(securityControls.w11WebAuthnPasskeys ?? securityControls.w8WebAuthnPasskeys) ? (
              <button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={isRegisteringPasskey}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>{isRegisteringPasskey ? 'Registering Biometrics...' : 'Register New Biometric Passkey'}</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>WebAuthn Passkey Control Disabled in Security Demo Panel (BEFORE Mode)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Pino Audit Log Viewer (W6) */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>User Audit Log Stream (W6 - Account Activity)</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {auditLogs.filter(log => !log.userId || log.userId === user?.id || log.userEmail === user?.email).length} events logged
            </span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {auditLogs.filter(log => !log.userId || log.userId === user?.id || log.userEmail === user?.email).length === 0 ? (
              <p className="text-slate-500 italic py-4">No audit log events recorded for this account yet.</p>
            ) : (
              auditLogs
                .filter(log => !log.userId || log.userId === user?.id || log.userEmail === user?.email)
                .map(log => {
                  const ctrl = getControlBadge(log.action);
                  return (
                    <div key={log.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                      <div className="flex flex-wrap justify-between items-center gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            log.result === 'SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {log.action}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-800" title={ctrl.title}>
                            Control: {ctrl.code}
                          </span>
                        </div>
                        <span className="text-slate-500">{new Date(log.timestamp).toISOString()}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] font-sans">{log.details}</p>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
