import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { SecurityControlState } from '../types';

export const SecurityTestingPanel: React.FC = () => {
  const { securityControls, toggleSecurityControl } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const controlsList: { key: keyof SecurityControlState; title: string; weakness: string; desc: string }[] = [
    {
      key: 'w1ObjectLevelAuth',
      weakness: 'W1 (BOLA)',
      title: 'Object-Level Authorization Guard',
      desc: 'Verifies JWT sub claim matches resource owner (prevents cross-account URL tampering).',
    },
    {
      key: 'w2ServerDerivedSender',
      weakness: 'W2 (Sender Spoofing)',
      title: 'Server-Derived Sender Identity',
      desc: 'Derives sender wallet strictly from req.user.sub, ignoring client-supplied senderId.',
    },
    {
      key: 'w3Argon2idHashing',
      weakness: 'W3 (Weak Password)',
      title: 'Argon2id Credential Hashing',
      desc: 'Hashes passwords with Argon2id prior to persistence, preventing credential leaks.',
    },
    {
      key: 'w4AtomicTransaction',
      weakness: 'W4 (Non-Atomic)',
      title: 'Atomic DB Transaction ($transaction)',
      desc: 'Executes debit and credit as a single atomic DB transaction; rolls back on failure.',
    },
    {
      key: 'w5IdempotencyKey',
      weakness: 'W5 (Replay/Duplicate)',
      title: 'Idempotency Key Verification',
      desc: 'Tracks Idempotency-Key headers to prevent double debits on network retries.',
    },
    {
      key: 'w6AuditLogging',
      weakness: 'W6 (Accountability)',
      title: 'Structured Pino Audit Logging',
      desc: 'Generates structured JSON logs for all login and transfer security events.',
    },
    {
      key: 'w7Aes256Encryption',
      weakness: 'W7 (Data Confidentiality)',
      title: 'AES-256-GCM Field-Level DB Encryption',
      desc: 'Encrypts CNIC in DB using AES-256-GCM with fresh 12-byte IVs & DLP masking.',
    },
    {
      key: 'w8SantanderBulkExport',
      weakness: 'W8 (Bulk Data Exfiltration)',
      title: 'Admin Bulk Export & Formula Sanitization',
      desc: 'Enforces ADMIN role, 500-row cap, DLP masking & CSV formula injection sanitization.',
    },
    {
      key: 'w9AccountKillSwitch',
      weakness: 'W9 (Kill-Switch)',
      title: 'Account Kill-Switch & 2s Session Logout',
      desc: 'Real-time DB status check terminating compromised active user sessions in < 2 seconds.',
    },
    {
      key: 'w10RateLimitStepUp',
      weakness: 'W10 (Velocity & Risk)',
      title: 'Velocity Limit (3/min) & Step-Up Auth',
      desc: 'Blocks automated bot transfer floods and demands password re-auth for transfers > PKR 5,000.',
    },
    {
      key: 'w11WebAuthnPasskeys',
      weakness: 'W11 (Passkeys)',
      title: 'FIDO2 WebAuthn Biometric Passkeys',
      desc: 'Enables hardware-backed biometric passkey registration & passwordless login alongside Argon2id.',
    },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 text-xs">
      <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-md">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>SECURITY EVALUATION DEMO PANEL</span>
          </div>
          <p className="text-slate-400 hidden md:block">
            Toggle controls to demonstrate <span className="text-slate-200 font-semibold">Before-and-After Security Behavior</span> (Assignment Section 7).
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-3 py-1 rounded-md transition-colors"
        >
          <span>{isExpanded ? 'Hide Controls' : 'Configure Weakness Controls (W1–W11)'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-slate-950 border-t border-slate-800/80 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1400px] mx-auto">
          {controlsList.map(item => {
            const isProtected = securityControls[item.key];
            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-lg border transition-all ${
                  isProtected
                    ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                    : 'bg-red-950/20 border-red-800/60 text-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                      {item.weakness}
                    </span>
                    <span className="font-semibold text-xs text-white">{item.title}</span>
                  </div>
                  <button
                    onClick={() => toggleSecurityControl(item.key)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider transition-colors ${
                      isProtected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-red-600 text-white hover:bg-red-500'
                    }`}
                  >
                    {isProtected ? 'AFTER (Protected)' : 'BEFORE (Vulnerable)'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
