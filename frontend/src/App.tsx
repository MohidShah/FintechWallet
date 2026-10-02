import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { SecurityTestingPanel } from './components/SecurityTestingPanel';
import { LoginView } from './components/views/LoginView';
import { RegisterView } from './components/views/RegisterView';
import { DashboardView } from './components/views/DashboardView';
import { SendMoneyView } from './components/views/SendMoneyView';
import { HistoryView } from './components/views/HistoryView';
import { ProfileView } from './components/views/ProfileView';
import { AdminView } from './components/views/AdminView';
import { LogoutModal } from './components/views/modals/LogoutModal';

import { TransactionReceiptModal } from './components/views/modals/TransactionReceiptModal';

const MainAppLayout: React.FC = () => {
  const { user, activeView, selectedTransaction, setSelectedTransaction } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Unauthenticated Views (No Sidebar)
  if (!user || activeView === 'login' || activeView === 'register') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <SecurityTestingPanel />
        <main className="flex-1 flex items-center justify-center">
          {activeView === 'register' ? <RegisterView /> : <LoginView />}
        </main>
      </div>
    );
  }

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'send':
        return 'Send Money';
      case 'history':
        return 'Transaction History';
      case 'profile':
        return 'Profile & Security Settings';
      case 'admin':
        return 'Admin Security & Oversight Panel';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Top Banner: Security Evaluation Controls */}
      <SecurityTestingPanel />

      {/* Main Desktop Dashboard Layout */}
      <div className="flex flex-1 min-h-[calc(100vh-42px)]">
        {/* Persistent 240px Sidebar */}
        <Sidebar onOpenLogoutModal={() => setIsLogoutModalOpen(true)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={getPageTitle()} />

          <main className="flex-1 p-8 overflow-y-auto">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'send' && <SendMoneyView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'profile' && <ProfileView />}
            {activeView === 'admin' && <AdminView />}
          </main>
        </div>
      </div>

      {/* Logout Modal Overlay */}
      {isLogoutModalOpen && (
        <LogoutModal onClose={() => setIsLogoutModalOpen(false)} />
      )}

      {/* Global Transaction Receipt Centered Popup Modal */}
      {selectedTransaction && (
        <TransactionReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainAppLayout />
    </AuthProvider>
  );
};

export default App;
