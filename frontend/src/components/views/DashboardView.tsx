import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Send, History, ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { wallet, user, transactions, setActiveView, setSelectedTransaction } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const allUserTransactions = transactions.filter(
    tx =>
      tx.senderWalletId === wallet?.id ||
      tx.receiverWalletId === wallet?.id ||
      (user?.email && (tx.senderEmail?.toLowerCase() === user.email.toLowerCase() || tx.receiverEmail?.toLowerCase() === user.email.toLowerCase()))
  );

  const userTransactions = allUserTransactions.slice(0, 5); // Recent 5

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Top Banner Greeting & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-medium backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Secure System Design Wallet</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Good day, {user?.fullName}!</h2>
          <p className="text-blue-100 text-xs">Your financial ledger is protected by object-level authorization & atomic transactions.</p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => setActiveView('send')}
            className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4 text-blue-600" />
            <span>Send Money</span>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className="px-4 py-2.5 bg-blue-800/60 hover:bg-blue-800 text-white font-medium text-xs rounded-xl border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            <span>Full History</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Balance Card + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Available Wallet Balance</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title={showBalance ? "Hide balance (Privacy)" : "Show balance"}
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="text-[11px] font-medium">{showBalance ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div>
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              {showBalance ? formatPKR(wallet?.balance || 0) : '••••••••••'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Account ID: <span className="font-mono text-slate-700 font-medium">{wallet?.id}</span>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Prisma Atomic Ledger Active</span>
            </div>
            <span>Currency: <strong>PKR (Simulated)</strong></span>
          </div>
        </div>

        {/* Quick Info Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Security Highlights</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every transfer generates an <strong>Idempotency-Key (W5)</strong> and derives sender identity from JWT session claims (W2).
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Registered Email:</span>
              <span className="font-mono font-medium text-slate-900 text-[11px]">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Transactions:</span>
              <span className="font-bold text-slate-900">{allUserTransactions.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Showing recent 5 transfers (total {allUserTransactions.length})</p>
          </div>
          {allUserTransactions.length > 0 && (
            <button
              onClick={() => setActiveView('history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All ({allUserTransactions.length})</span>
              <span>→</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Transaction ID</th>
                <th className="py-3.5 px-6">Counterparty</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Date / Timestamp</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                userTransactions.map(tx => {
                  const isSent = tx.senderWalletId === wallet?.id || (user?.email && tx.senderEmail?.toLowerCase() === user.email.toLowerCase());
                  const counterpartyName = isSent ? tx.receiverName : tx.senderName;
                  const counterpartyEmail = isSent ? tx.receiverEmail : tx.senderEmail;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTransaction(tx)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6 font-mono font-medium text-slate-600 text-[11px]">
                        {tx.id}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSent ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {isSent ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{counterpartyName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{counterpartyEmail}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                          isSent ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {isSent ? 'Sent' : 'Received'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className={`py-4 px-6 text-right font-bold text-sm tabular-nums ${
                        isSent ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {isSent ? '-' : '+'} {formatPKR(tx.amount)}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status || 'Completed'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(tx);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                          title="View Transaction Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {allUserTransactions.length > 5 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing <strong>5</strong> of <strong>{allUserTransactions.length}</strong> recent transactions
            </span>
            <button
              onClick={() => setActiveView('history')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>View All {allUserTransactions.length} Transactions</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
