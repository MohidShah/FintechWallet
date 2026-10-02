import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Lock, X, ArrowRight } from 'lucide-react';

interface StepUpAuthModalProps {
  amount: number;
  recipientName: string;
  onVerify: (password: string) => void;
  onCancel: () => void;
}

export const StepUpAuthModal: React.FC<StepUpAuthModalProps> = ({ amount, recipientName, onVerify, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your account password to verify step-up authentication.');
      return;
    }
    onVerify(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight">Step-Up Verification Required</h3>
              <p className="text-[10px] text-amber-300 font-mono">Control #48 / #59 / #99 (High-Risk Action)</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>High-Value Transfer Triggered ({formatPKR(amount)})</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Transfers exceeding <strong>PKR 5,000</strong> to <strong>{recipientName}</strong> require step-up password confirmation to protect against session hijacking.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Enter Your Password</span>
              <span className="text-[11px] text-slate-400 font-normal">Argon2id Hash Verified</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Account password (e.g. Password123!)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Authorize Transfer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
