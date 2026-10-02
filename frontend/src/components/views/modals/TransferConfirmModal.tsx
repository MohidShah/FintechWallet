import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface TransferConfirmModalProps {
  recipientName: string;
  recipientEmail: string;
  amount: number;
  note?: string;
  onConfirm: (idempotencyKey: string) => void;
  onCancel: () => void;
}

export const TransferConfirmModal: React.FC<TransferConfirmModalProps> = ({
  recipientName,
  recipientEmail,
  amount,
  note,
  onConfirm,
  onCancel,
}) => {
  // Generate unique client UUID idempotency key (W5 control)
  const [idempotencyKey] = useState(() => `ik-uuid-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`);

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6">
        {/* Modal Header */}
        <div className="text-center">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold mb-2">
            Step 2 of 2: Final Verification
          </span>
          <h3 className="text-xl font-bold text-slate-900">Confirm Transfer</h3>
          <p className="text-xs text-slate-500 mt-1">Please review transfer details carefully before submitting.</p>
        </div>

        {/* Transfer Summary Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {recipientName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <span className="font-semibold text-slate-900 text-sm block">{recipientName}</span>
              <span className="text-xs text-slate-500 font-mono">{recipientEmail}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 flex justify-between items-baseline">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer Amount</span>
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{formatPKR(amount)}</span>
          </div>

          {note && (
            <div className="pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500 font-medium">Note: </span>
              <span className="text-slate-800 italic">"{note}"</span>
            </div>
          )}
        </div>

        {/* Security / Idempotency Footer */}
        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>W5 Idempotency Key Generated:</span>
          </div>
          <p className="font-mono text-[10px] text-slate-600 truncate">{idempotencyKey}</p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => onConfirm(idempotencyKey)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Confirm & Send Funds</span>
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
