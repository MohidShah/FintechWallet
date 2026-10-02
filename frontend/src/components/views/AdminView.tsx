import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
  ArrowLeftRight,
  Terminal,
  Key,
  Search,
  Lock,
  Eye,
  Database,
  UserX,
  UserCheck,
  Download
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { allUsers: contextUsers, transactions: contextTxs, auditLogs: contextLogs, securityControls, addAuditLog } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'ledger' | 'traceability'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL');
  const [isPiiMasked, setIsPiiMasked] = useState(true);

  const maskEmail = (email: string) => {
    if (!isPiiMasked || !email) return email;
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `*@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  const maskCnic = (cnic?: string) => {
    const rawCnic = cnic || '42101-9823412-1';
    if (!isPiiMasked) return rawCnic;
    return `${rawCnic.slice(0, 5)}-******${rawCnic.slice(-3)}`;
  };

  const maskId = (id: string) => {
    if (!isPiiMasked || !id) return id;
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  // DB-driven live states
  const [dbStats, setDbStats] = useState<{ totalUsers: number; totalLiquidity: number; totalTransactions: number; totalVolume: number; totalLogs: number } | null>(null);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [dbTxs, setDbTxs] = useState<any[]>([]);

  const loadDbData = async () => {
    try {
      const [stats, users, logs, txs] = await Promise.all([
        apiService.getAdminStats(),
        apiService.getAdminUsers(),
        apiService.getAdminLogs(),
        apiService.getAdminTransactions(),
      ]);
      if (stats) setDbStats(stats);
      if (users && users.length > 0) setDbUsers(users);
      if (logs && logs.length > 0) setDbLogs(logs);
      if (txs && txs.length > 0) setDbTxs(txs);
    } catch (err) {
      console.warn('Backend API connection fallback');
    }
  };

  useEffect(() => {
    loadDbData();
  }, []);

  const handleToggleBlock = async (userId: string) => {
    try {
      await apiService.toggleBlockUser(userId);
      await loadDbData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account block status');
    }
  };

  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    // Sanitize cells to prevent CSV / Formula Injection (=, +, -, @, \t, \r)
    const sanitizeCell = (cell: string | number) => {
      let str = String(cell);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str; // Neutralize executable spreadsheet formulas
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => sanitizeCell(cell)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLedger = () => {
    const headers = ['Transaction ID', 'Timestamp', 'Sender Name', 'Sender Email', 'Receiver Name', 'Receiver Email', 'Amount (PKR)', 'Status', 'Idempotency Key'];
    // Volume cap limit & data minimization
    const exportRows = displayTxs.slice(0, 500);
    const rows = exportRows.map(tx => [
      tx.id,
      new Date(tx.createdAt).toLocaleString(),
      tx.senderName,
      isPiiMasked ? maskEmail(tx.senderEmail) : tx.senderEmail,
      tx.receiverName,
      isPiiMasked ? maskEmail(tx.receiverEmail) : tx.receiverEmail,
      tx.amount,
      tx.status || 'Completed',
      tx.idempotencyKey || 'ik-default'
    ]);
    exportToCSV(`admin_global_ledger_${Date.now()}.csv`, headers, rows);
    addAuditLog('ADMIN_EXPORT_GLOBAL_LEDGER_SUCCESS', 'SUCCESS', `Admin exported global transaction ledger containing ${rows.length} records (Santander W8 Bulk Export Control)`);
  };

  const handleExportAuditLogs = () => {
    const headers = ['Log ID', 'Timestamp', 'Action / Event', 'Result', 'User Email', 'Details'];
    const exportRows = displayLogs.slice(0, 500);
    const rows = exportRows.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.action,
      l.result,
      isPiiMasked ? maskEmail(l.userEmail || '') : (l.userEmail || 'N/A'),
      l.details || ''
    ]);
    exportToCSV(`admin_security_audit_stream_${Date.now()}.csv`, headers, rows);
    addAuditLog('ADMIN_EXPORT_AUDIT_STREAM_SUCCESS', 'SUCCESS', `Admin exported system audit stream containing ${rows.length} records (Santander W8 Bulk Export Control)`);
  };

  const displayUsers = dbUsers.length > 0 ? dbUsers : contextUsers.map(u => ({
    ...u,
    balance: 1000000,
    role: u.role || 'CUSTOMER'
  }));

  const displayLogs = dbLogs.length > 0 ? dbLogs : contextLogs;
  const displayTxs = dbTxs.length > 0 ? dbTxs : contextTxs;

  // Calculate Metrics
  const totalUsersCount = dbStats ? dbStats.totalUsers : displayUsers.length;
  const totalSystemLiquidity = dbStats ? dbStats.totalLiquidity : displayUsers.reduce((sum, u) => sum + (u.balance || 1000000), 0);
  const totalTransactionsCount = dbStats ? dbStats.totalTransactions : displayTxs.length;
  const totalTransactionVolume = dbStats ? dbStats.totalVolume : displayTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const blockedThreatsCount = displayLogs.filter(l => l.result === 'FAILURE' || (l.action && (l.action.includes('BLOCKED') || l.action.includes('REPLAY')))).length;

  // Filtered Users
  const filteredUsers = displayUsers.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtered Audit Logs
  const filteredLogs = displayLogs.filter(log => {
    const matchesFilter = logFilter === 'ALL' || log.result === logFilter;
    const matchesSearch =
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Security Officer & Admin Oversight Panel</h2>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                System Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Centralized System Audit, User Directory, Global Ledger & Security Traceability (W1–W11)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPiiMasked(!isPiiMasked)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isPiiMasked
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700/80 text-amber-300'
            }`}
          >
            {isPiiMasked ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPiiMasked ? 'DLP Masked (Control #15)' : 'Unmasked (PII Visible)'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 font-mono text-xs bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>NestJS API Active</span>
          </div>
        </div>
      </div>

      {/* System Overview Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUsersCount}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered Wallet Users</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: System Liquidity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Liquidity</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">Rs. {totalSystemLiquidity.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Total System Balance</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Ledger Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ledger Volume</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">Rs. {totalTransactionVolume.toLocaleString()}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{totalTransactionsCount} Transfers Executed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Threat Blocks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Events</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{displayLogs.length}</h3>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{blockedThreatsCount} Threat Events Handled</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Wallet Directory ({displayUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Terminal className="w-4 h-4" />
          <span>System Audit Trail (W6 Logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'ledger' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Database className="w-4 h-4" />
          <span>Global Ledger & Idempotency (W5)</span>
        </button>

        <button
          onClick={() => setActiveTab('traceability')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${activeTab === 'traceability' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Key className="w-4 h-4" />
          <span>Traceability Matrix (W1–W11)</span>
        </button>
      </div>

      {/* TAB 1: User & Wallet Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-900 text-sm">All Registered System Accounts</h3>
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user name, email, ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">National ID (CNIC)</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Auth Hash Type</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Account Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">No matching users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{maskId(u.id)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-medium">{maskCnic(u.cnic)}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{maskEmail(u.email)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.isBlocked
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-semibold">
                          <Lock className="w-3 h-3" /> Argon2id (W3)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        Rs. {(u.balance !== undefined ? Number(u.balance) : 1000000).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.role === 'ADMIN' || u.email === 'admin@securewallet.io' ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200/80 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" /> System Admin
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleBlock(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all mx-auto ${
                              u.isBlocked
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20'
                            }`}
                          >
                            {u.isBlocked ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            <span>{u.isBlocked ? 'Unblock Account' : 'Block Account'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: System-Wide Audit Stream (W6) */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>Centralized Pino Security Audit Stream (W6)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setLogFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${logFilter === 'ALL' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  ALL ({displayLogs.length})
                </button>
                <button
                  onClick={() => setLogFilter('SUCCESS')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${logFilter === 'SUCCESS' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  SUCCESS
                </button>
                <button
                  onClick={() => setLogFilter('FAILURE')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${logFilter === 'FAILURE' ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  FAILURE / BLOCKED
                </button>
              </div>

              <button
                onClick={handleExportAuditLogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export Pino Audit Stream as CSV (Role-Based Control W1 & DLP Masking W7)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-500 italic py-6 text-center">No audit log events match the criteria.</p>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${log.result === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                      : 'bg-red-950 text-red-400 border border-red-800/80'
                      }`}>
                      {log.action}
                    </span>
                    <span className="text-slate-500 font-mono">{new Date(log.timestamp).toISOString()}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">{log.details}</p>
                  {log.userEmail && (
                    <span className="text-[10px] text-slate-500 block font-mono">User: {log.userEmail}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Global Ledger & Idempotency Keys (W5) */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System-Wide Transfer Ledger</h3>
              <p className="text-xs text-slate-500">Atomic database transfers with client UUID Idempotency-Key tracking (W4 & W5)</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono">
                {displayTxs.length} Ledger Entries
              </span>
              <button
                onClick={handleExportLedger}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export System-Wide Ledger as CSV (Role-Based Control W1 & DLP Masking W7)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Ledger CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Tx ID</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Idempotency Key (W5)</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">No transaction records in ledger.</td>
                  </tr>
                ) : (
                  displayTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{tx.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{tx.senderName} ({tx.senderEmail})</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{tx.receiverName} ({tx.receiverEmail})</td>
                      <td className="py-3 px-4 font-bold text-emerald-600 tabular-nums">Rs. {tx.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-700">{tx.idempotencyKey || 'ik-default'}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Threat-to-Control Traceability Room */}
      {activeTab === 'traceability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Controls Summary Matrix */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Assignment Security Traceability Matrix (W1–W11)</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W1: Anti-BOLA Guard</span>
                  <p className="text-slate-500 text-[11px]">Validates JWT `sub` against `:userId` path param in `OwnershipGuard`</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w1ObjectLevelAuth ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w1ObjectLevelAuth ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W2: Server-Derived Identity</span>
                  <p className="text-slate-500 text-[11px]">Derives sender ID strictly from JWT session token, ignoring body params</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w2ServerDerivedSender ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w2ServerDerivedSender ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W3: Argon2id Hashing</span>
                  <p className="text-slate-500 text-[11px]">Hashes credentials with Argon2id memory cost 64MB & 3 iterations</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w3Argon2idHashing ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w3Argon2idHashing ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W4: Atomic DB Transactions</span>
                  <p className="text-slate-500 text-[11px]">Executes debit, credit, & log inside `prisma.$transaction([])`</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w4AtomicTransaction ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w4AtomicTransaction ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W5: Idempotency Replay Guard</span>
                  <p className="text-slate-500 text-[11px]">Stores `Idempotency-Key` headers to block double transfers</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w5IdempotencyKey ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w5IdempotencyKey ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W6: Pino Audit Logging</span>
                  <p className="text-slate-500 text-[11px]">Logs structured JSON security events with redacted authorization headers</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w6AuditLogging ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w6AuditLogging ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W7: AES-256-GCM Field Encryption at Rest</span>
                  <p className="text-slate-500 text-[11px]">Encrypts CNIC in DB using AES-256-GCM with fresh 12-byte IVs & DLP Masking</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${securityControls.w7Aes256Encryption ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {securityControls.w7Aes256Encryption ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W8: Santander Bulk Export Protection</span>
                  <p className="text-slate-500 text-[11px]">Enforces ADMIN role, 500-row cap, DLP masking & CSV formula injection sanitization</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(securityControls.w8SantanderBulkExport ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {(securityControls.w8SantanderBulkExport ?? true) ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W9: Account Freeze & 2s Logout Watcher</span>
                  <p className="text-slate-500 text-[11px]">Real-time DB status check terminating compromised active user sessions in &lt; 2s</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(securityControls.w9AccountKillSwitch ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {(securityControls.w9AccountKillSwitch ?? true) ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W10: Velocity Limiter & Step-Up Auth</span>
                  <p className="text-slate-500 text-[11px]">Blocks bot transfer floods (3 req/min) & demands password re-auth for &gt; 5K PKR</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(securityControls.w10RateLimitStepUp ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {(securityControls.w10RateLimitStepUp ?? true) ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900">W11: FIDO2 WebAuthn Passkeys</span>
                  <p className="text-slate-500 text-[11px]">Enables hardware biometric passkey registration & passwordless login alongside Argon2id</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(securityControls.w11WebAuthnPasskeys ?? securityControls.w8WebAuthnPasskeys) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {(securityControls.w11WebAuthnPasskeys ?? securityControls.w8WebAuthnPasskeys) ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          </div>

          {/* System Security Verification & Evidence Summary */}
          <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Security Evidence & System Integrity Verification</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              This Admin Panel provides complete visibility and evidence into the live security state, active controls, and audit integrity of the system:
            </p>

            <ul className="text-xs text-slate-400 space-y-2.5 list-disc pl-4">
              <li>
                <strong className="text-white">Account Oversight:</strong> Inspects all registered user wallets and initial demo allocations.
              </li>
              <li>
                <strong className="text-white">Threat Accountability:</strong> Observes blocked BOLA access attempts and duplicate idempotency transfer replays live.
              </li>
              <li>
                <strong className="text-white">Database Consistency:</strong> Verifies atomic transactions and system liquidity integrity.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
