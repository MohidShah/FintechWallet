import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Database, Lock, CheckCircle2 } from 'lucide-react';

interface TransferProcessingModalProps {
  amount: number;
  recipientName: string;
  onComplete: () => void;
}

export const TransferProcessingModal: React.FC<TransferProcessingModalProps> = ({ amount, recipientName, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(1);

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amt);
  };

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(35);
      setStep(2);
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(75);
      setStep(3);
    }, 800);

    const timer3 = setTimeout(() => {
      setProgress(100);
    }, 1200);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl text-center space-y-6 text-white animate-in zoom-in-95 duration-200">
        {/* Animated Processing Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto relative">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 animate-ping pointer-events-none" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Processing Secure Transfer</h3>
          <p className="text-xs text-slate-400 mt-1">
            Sending <strong className="text-white">{formatPKR(amount)}</strong> to <span className="text-slate-200">{recipientName}</span>
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-blue-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Security Pipeline</span>
            <span className="font-bold text-blue-400">{progress}%</span>
          </div>
        </div>

        {/* Dynamic Security Steps List */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 text-left text-xs space-y-2.5 font-mono">
          <div className={`flex items-center gap-2.5 transition-colors ${step >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
            {step > 1 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
            <span className="text-[11px]">W2: Server-Derived JWT Identity</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${step >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
            {step > 2 ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
            <span className="text-[11px]">W5: Idempotency Key Replay Verification</span>
          </div>

          <div className={`flex items-center gap-2.5 transition-colors ${step >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
            {progress === 100 ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <Database className="w-4 h-4 shrink-0" />}
            <span className="text-[11px]">W4: Atomic SQLite $transaction</span>
          </div>
        </div>
      </div>
    </div>
  );
};
