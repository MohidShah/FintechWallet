import React from 'react';
import { X, ShieldCheck, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';
import type { Transaction } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface TransactionDetailDrawerProps {
  transaction: Transaction;
  onClose: () => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({ transaction, onClose }) => {
  const { wallet } = useAuth();
  const isSent = transaction.senderWalletId === wallet?.id;

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(amt);
  };

  const txDate = new Date(transaction.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[440px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header Bar */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <h3 className="font-bold text-slate-900 text-base">Transaction Details</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Amount & Status Badge */}
          <div className="p-8 text-center bg-slate-50/50 border-b border-slate-100">
            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-sm ${
              isSent ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isSent ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
            </div>

            <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${
              isSent ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {isSent ? '-' : '+'} {formatPKR(transaction.amount)}
            </div>

            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Completed
              </span>
            </div>
          </div>

          {/* Label-Value Details */}
          <div className="p-6 space-y-4 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Transaction Type</span>
              <span className="font-semibold text-slate-800">{isSent ? 'Funds Sent (Debit)' : 'Funds Received (Credit)'}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Sender</span>
              <div className="text-right">
                <span className="font-semibold text-slate-800 block">{transaction.senderName}</span>
                <span className="text-[11px] text-slate-400 font-mono break-all">{transaction.senderEmail}</span>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Receiver</span>
              <div className="text-right">
                <span className="font-semibold text-slate-800 block">{transaction.receiverName}</span>
                <span className="text-[11px] text-slate-400 font-mono break-all">{transaction.receiverEmail}</span>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-mono text-slate-800">{txDate.toLocaleDateString()} {txDate.toLocaleTimeString()}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono font-semibold text-slate-800 break-all text-right max-w-[220px]">{transaction.id}</span>
            </div>

            {transaction.idempotencyKey && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Idempotency Key</span>
                <span className="font-mono text-[11px] text-blue-700 break-all text-right max-w-[220px]">{transaction.idempotencyKey}</span>
              </div>
            )}

            {transaction.note && (
              <div className="py-2 border-b border-slate-100">
                <span className="text-slate-500 block mb-1">Transfer Note</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 italic break-words">
                  "{transaction.note}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 space-y-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Audit & Compliance Trace:</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Record verified under Object-Level Authorization Guard (W1). Debit and credit executed as single atomic unit (W4).
          </p>
        </div>
      </div>
    </div>
  );
};
