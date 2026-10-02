import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, Eye, Download } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { transactions, wallet, user, setSelectedTransaction, addAuditLog } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SENT' | 'RECEIVED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const formatPKR = (amt: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amt);
  };

  const filteredTransactions = transactions.filter(tx => {
    const isSent = tx.senderWalletId === wallet?.id || (wallet?.userId && tx.senderWalletId === wallet.userId) || (tx.senderEmail && tx.senderEmail.toLowerCase() === user?.email?.toLowerCase());
    const isReceived = tx.receiverWalletId === wallet?.id || (wallet?.userId && tx.receiverWalletId === wallet.userId) || (tx.receiverEmail && tx.receiverEmail.toLowerCase() === user?.email?.toLowerCase());

    if (!isSent && !isReceived) return false; // W1 filter: user only sees their own transactions

    if (typeFilter === 'SENT' && !isSent) return false;
    if (typeFilter === 'RECEIVED' && !isReceived) return false;
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSender = tx.senderName.toLowerCase().includes(term) || tx.senderEmail.toLowerCase().includes(term);
      const matchReceiver = tx.receiverName.toLowerCase().includes(term) || tx.receiverEmail.toLowerCase().includes(term);
      const matchNote = tx.note?.toLowerCase().includes(term);
      const matchId = tx.id.toLowerCase().includes(term);
      return matchSender || matchReceiver || matchNote || matchId;
    }

    return true;
  });

  const handleExportStatement = () => {
    const headers = ['Transaction ID', 'Date / Timestamp', 'Counterparty Name', 'Counterparty Email', 'Movement Type', 'Amount (PKR)', 'Status'];
    const rows = filteredTransactions.map(tx => {
      const isSent = tx.senderWalletId === wallet?.id || (wallet?.userId && tx.senderWalletId === wallet.userId) || (tx.senderEmail && tx.senderEmail.toLowerCase() === user?.email?.toLowerCase());
      const counterpartyName = isSent ? tx.receiverName : tx.senderName;
      const counterpartyEmail = isSent ? tx.receiverEmail : tx.senderEmail;
      return [
        tx.id,
        new Date(tx.createdAt).toLocaleString(),
        counterpartyName,
        counterpartyEmail,
        isSent ? 'Sent' : 'Received',
        tx.amount,
        tx.status || 'Completed'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `account_statement_${user?.email || 'wallet'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // W6 Audit Stream Event Recording
    addAuditLog('USER_EXPORT_STATEMENT_SUCCESS', 'SUCCESS', `User ${user?.email} exported statement containing ${filteredTransactions.length} records (W7 Self Export Control)`);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction History</h2>
          <p className="text-xs text-slate-500 mt-1">Audit trail of all financial movements under your verified session</p>
        </div>

        <button
          onClick={handleExportStatement}
          className="self-start md:self-auto px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Statement (.CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search counterparty, email, or TX ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Movements</option>
            <option value="SENT">Sent Funds</option>
            <option value="RECEIVED">Received Funds</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Web Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions match your query.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isSent = tx.senderWalletId === wallet?.id || (wallet?.userId && tx.senderWalletId === wallet.userId) || (tx.senderEmail && tx.senderEmail.toLowerCase() === user?.email?.toLowerCase());
                  const counterpartyName = isSent ? tx.receiverName : tx.senderName;
                  const counterpartyEmail = isSent ? tx.receiverEmail : tx.senderEmail;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTransaction(tx)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
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
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>

                      <td className={`py-4 px-6 text-right font-extrabold text-sm tabular-nums ${
                        isSent ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {isSent ? '-' : '+'} {formatPKR(tx.amount)}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(tx);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
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
      </div>
    </div>
  );
};
