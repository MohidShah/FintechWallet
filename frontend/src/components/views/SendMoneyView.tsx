import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Send, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import { TransferConfirmModal } from './modals/TransferConfirmModal';
import { TransferProcessingModal } from './modals/TransferProcessingModal';
import { TransactionReceiptModal } from './modals/TransactionReceiptModal';
import { TransferErrorModal } from './modals/TransferErrorModal';
import type { Transaction } from '../../types';

import { StepUpAuthModal } from './modals/StepUpAuthModal';

export const SendMoneyView: React.FC = () => {
  const { allUsers, user, wallet, executeTransfer } = useAuth();
  
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');

  // Modals state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState('');
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const availableRecipients = allUsers.filter(
    u => u.id !== user?.id && u.role !== 'ADMIN' && u.email !== 'admin@securewallet.io'
  );

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const numAmount = parseFloat(amountStr);
    if (!recipientEmail) {
      setValidationError('Please select a valid recipient.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid transfer amount greater than 0.');
      return;
    }
    if (wallet && numAmount > wallet.balance) {
      setValidationError(`Insufficient balance. Current balance is Rs. ${wallet.balance.toLocaleString()}`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSend = (idempotencyKey: string) => {
    setIsConfirmOpen(false);
    setPendingIdempotencyKey(idempotencyKey);

    // Step-Up Trigger for high-value transfers (> PKR 5,000)
    if (parseFloat(amountStr) > 5000) {
      setIsStepUpOpen(true);
    } else {
      setIsProcessing(true);
    }
  };

  const handleStepUpVerified = (pass: string) => {
    setStepUpPassword(pass);
    setIsStepUpOpen(false);
    setIsProcessing(true);
  };

  const handleProcessingComplete = async () => {
    setIsProcessing(false);

    const result = await executeTransfer({
      receiverEmail: recipientEmail,
      amount: parseFloat(amountStr),
      note,
      idempotencyKey: pendingIdempotencyKey || `ik-${Date.now()}`,
      stepUpPassword,
    });

    setStepUpPassword(''); // Reset step-up password

    if (result.success && result.transaction) {
      setCompletedTx(result.transaction);
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-4">
      {/* Centered Send Money Card */}
      <div className="max-w-[480px] mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-md p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Send Money</h2>
            <p className="text-xs text-slate-500">Transfer funds instantly to another registered user</p>
          </div>
        </div>

        {validationError && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-6">
          {/* Recipient Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">To (Registered User)</label>
            <div className="relative">
              <select
                required
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white appearance-none"
              >
                <option value="">Select registered user...</option>
                {availableRecipients.map(r => (
                  <option key={r.id} value={r.email}>
                    {r.fullName} ({r.email})
                  </option>
                ))}
              </select>
              <UserCheck className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Recipient restricted to registered accounts to prevent typos.</p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (PKR)</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 font-bold text-slate-400 text-lg">Rs.</span>
              <input
                type="number"
                step="any"
                required
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full pl-14 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white tabular-nums"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
              <span>Available: <strong>Rs. {wallet?.balance.toLocaleString()}</strong></span>
              <button
                type="button"
                onClick={() => setAmountStr(wallet?.balance.toString() || '0')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Use Max
              </button>
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Add a Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Dinner split, Freelance payment"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Security Features Info Box */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Security Guarantees:</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 pl-5 list-disc">
              <li><strong>W2:</strong> Sender identity derived strictly from server JWT claim.</li>
              <li><strong>W4:</strong> Debit & credit executed atomically in 1 DB transaction.</li>
              <li><strong>W5:</strong> Transfer protected by client UUID Idempotency-Key.</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Continue to Review</span>
          </button>
        </form>
      </div>

      {isConfirmOpen && (
        <TransferConfirmModal
          recipientName={allUsers.find(u => u.email === recipientEmail)?.fullName || recipientEmail}
          recipientEmail={recipientEmail}
          amount={parseFloat(amountStr)}
          note={note}
          onConfirm={handleConfirmSend}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}

      {isStepUpOpen && (
        <StepUpAuthModal
          amount={parseFloat(amountStr)}
          recipientName={allUsers.find(u => u.email === recipientEmail)?.fullName || recipientEmail}
          onVerify={handleStepUpVerified}
          onCancel={() => setIsStepUpOpen(false)}
        />
      )}

      {isProcessing && (
        <TransferProcessingModal
          amount={parseFloat(amountStr)}
          recipientName={allUsers.find(u => u.email === recipientEmail)?.fullName || recipientEmail}
          onComplete={handleProcessingComplete}
        />
      )}

      {completedTx && (
        <TransactionReceiptModal
          transaction={completedTx}
          titleOverride="Payment Receipt"
          onClose={() => {
            setCompletedTx(null);
            setAmountStr('');
            setNote('');
            setRecipientEmail('');
          }}
        />
      )}

      {errorMessage && (
        <TransferErrorModal
          errorMessage={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      )}
    </div>
  );
};
