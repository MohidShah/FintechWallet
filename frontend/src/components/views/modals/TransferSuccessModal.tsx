import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Transaction } from '../../../types';

interface TransferSuccessModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const TransferSuccessModal: React.FC<TransferSuccessModalProps> = ({ transaction, onClose }) => {
  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-6">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-slate-900">Transfer Successful</h3>
          <p className="text-sm font-semibold text-emerald-700 mt-1">
            {formatPKR(transaction.amount)} sent to {transaction.receiverName}
          </p>
        </div>

        {/* Transaction Receipt Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-xs text-left space-y-2.5">
          <div className="flex justify-between items-center text-slate-500">
            <span>Transaction ID:</span>
            <span className="font-mono text-slate-800 font-semibold">{transaction.id}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Recipient Email:</span>
            <span className="font-medium text-slate-800">{transaction.receiverEmail}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Timestamp:</span>
            <span className="font-mono text-slate-800">{new Date(transaction.createdAt).toLocaleString()}</span>
          </div>
          {transaction.idempotencyKey && (
            <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200/60">
              <span className="flex items-center gap-1 text-[11px] text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5" /> W5 Idempotency:
              </span>
              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[160px]">{transaction.idempotencyKey}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
        >
          <span>Back to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
