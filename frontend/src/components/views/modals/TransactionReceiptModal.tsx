import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, ArrowUpRight, ArrowDownLeft, Copy, Check, Printer, X, Lock } from 'lucide-react';
import type { Transaction } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface TransactionReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
  titleOverride?: string;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({ transaction, onClose, titleOverride }) => {
  const { wallet } = useAuth();
  const [copied, setCopied] = useState(false);

  const isSent = transaction.senderWalletId === wallet?.id;

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(amt);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const txDate = new Date(transaction.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Receipt Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-600/30">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">{titleOverride || 'Transaction Receipt'}</h3>
              <p className="text-[10px] text-slate-400 font-mono">Verified SSD Ledger Record</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Amount Header */}
          <div className="text-center bg-slate-50/80 rounded-2xl p-6 border border-slate-200/60">
            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-bold ${
              isSent ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isSent ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
            </div>

            <div className={`text-3xl font-extrabold tabular-nums tracking-tight ${
              isSent ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {isSent ? '-' : '+'} {formatPKR(transaction.amount)}
            </div>

            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Payment Completed & Settlement Confirmed</span>
            </div>
          </div>

          {/* Receipt Breakdown Table */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Transaction Type</span>
              <span className={`font-semibold px-2.5 py-0.5 rounded text-[11px] ${
                isSent ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {isSent ? 'Funds Sent (Debit)' : 'Funds Received (Credit)'}
              </span>
            </div>

            <div className="flex justify-between items-start py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium pt-0.5">Sender</span>
              <div className="text-right">
                <span className="font-semibold text-slate-900 block">{transaction.senderName}</span>
                <span className="text-[11px] text-slate-400 font-mono break-all">{transaction.senderEmail}</span>
              </div>
            </div>

            <div className="flex justify-between items-start py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium pt-0.5">Recipient</span>
              <div className="text-right">
                <span className="font-semibold text-slate-900 block">{transaction.receiverName}</span>
                <span className="text-[11px] text-slate-400 font-mono break-all">{transaction.receiverEmail}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Date & Timestamp</span>
              <span className="font-mono text-slate-800">{txDate.toLocaleDateString()} {txDate.toLocaleTimeString()}</span>
            </div>

            {/* Reference ID with 1-Click Copy */}
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Receipt Ref ID</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-slate-900 text-[11px] break-all">{transaction.id}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title="Copy Receipt ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {transaction.idempotencyKey && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Idempotency Key (W5)</span>
                <span className="font-mono text-[11px] text-blue-700 break-all text-right max-w-[200px]">{transaction.idempotencyKey}</span>
              </div>
            )}

            {transaction.note && (
              <div className="py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium block mb-1">Transfer Note</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 italic text-[11px]">
                  "{transaction.note}"
                </p>
              </div>
            )}
          </div>

          {/* Security Compliance Audit Banner */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Security & Audit Verification</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[10.5px]">
              Executed inside Prisma Atomic DB Transaction (W4). Sender identity verified via JWT Session (W2) and guarded by Object-Level Authorization (W1).
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
