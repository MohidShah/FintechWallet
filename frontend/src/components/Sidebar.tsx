import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  User, 
  LogOut, 
  Wallet,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  onOpenLogoutModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenLogoutModal }) => {
  const { activeView, setActiveView, user } = useAuth();

  const navItems = user?.role === 'ADMIN'
    ? [
        { id: 'admin', label: 'Admin Security Panel', icon: ShieldCheck },
        { id: 'profile', label: 'Profile & Security', icon: User },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'send', label: 'Send Money', icon: Send },
        { id: 'history', label: 'Transaction History', icon: History },
        { id: 'profile', label: 'Profile & Security', icon: User },
      ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      <div>
        {/* Logo / App Name */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg leading-none">SecureWallet</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
              Fintech SSD
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Chip & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 py-1 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
            {user?.fullName.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={onOpenLogoutModal}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          Log Out
        </button>
      </div>
    </aside>
  );
};
