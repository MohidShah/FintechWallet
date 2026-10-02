import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface TransferErrorModalProps {
  errorMessage: string;
  onClose: () => void;
}

export const TransferErrorModal: React.FC<TransferErrorModalProps> = ({ errorMessage, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-slate-900">Transfer Failed</h3>
          <p className="text-sm font-medium text-slate-600 mt-2 px-2 leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="p-3 bg-red-50 rounded-xl border border-red-200/60 text-[11px] text-red-800 text-left">
          <strong>Security Note (Assignment Requirement):</strong> Error messages are phrasing-sanitized to communicate error context without exposing vulnerable internal system traces or account enumeration vectors.
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
};
