import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

interface TopBarProps {
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secure Sandbox API Active</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* User Quick Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
            {user?.fullName.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="text-xs">
            <span className="font-semibold text-slate-900 block leading-tight">{user?.fullName}</span>
            <span className="text-[11px] text-slate-500 font-mono">@{user?.username}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
