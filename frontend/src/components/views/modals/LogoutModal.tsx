import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface LogoutModalProps {
  onClose: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ onClose }) => {
  const { logout } = useAuth();

  const handleConfirmLogout = () => {
    onClose();
    logout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <LogOut className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900">Log Out?</h3>
          <p className="text-xs text-slate-500 mt-1">Are you sure you want to end your active wallet session?</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLogout}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-red-600/20 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
