import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Wallet, Transaction, AuditLog, SecurityControlState } from '../types';
import { apiService, getStoredToken, isTokenExpired, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  allUsers: User[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  securityControls: SecurityControlState;
  activeView: 'dashboard' | 'send' | 'history' | 'profile' | 'admin' | 'login' | 'register';
  selectedTransaction: Transaction | null;
  
  // Actions
  setActiveView: (view: 'dashboard' | 'send' | 'history' | 'profile' | 'admin' | 'login' | 'register') => void;
  login: (email: string, pass?: string) => Promise<{ success: boolean; message?: string }>;
  setAuthenticatedUser: (user: User, token: string) => void;
  register: (name: string, email: string, username: string, pass: string, cnic?: string) => Promise<boolean>;
  logout: () => void;
  toggleSecurityControl: (controlKey: keyof SecurityControlState) => void;
  setSelectedTransaction: (tx: Transaction | null) => void;
  addAuditLog: (action: string, result: 'SUCCESS' | 'FAILURE', details?: string) => void;
  
  // Wallet Operations
  executeTransfer: (params: {
    receiverEmail: string;
    amount: number;
    note?: string;
    idempotencyKey: string;
    stepUpPassword?: string;
    spoofedSenderId?: string;
    targetUserIdOverride?: string;
  }) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;
}

const ADMIN_USER: User = {
  id: 'usr-admin-001',
  fullName: 'Security Officer Admin',
  email: 'admin@securewallet.io',
  username: 'admin_officer',
  role: 'ADMIN',
};

const INITIAL_USERS: User[] = [ADMIN_USER];

const INITIAL_WALLETS: Record<string, Wallet> = {
  'usr-admin-001': { id: 'w-admin-001', userId: 'usr-admin-001', balance: 100000, currency: 'PKR' },
};

const INITIAL_TRANSACTIONS: Transaction[] = [];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [wallets, setWallets] = useState<Record<string, Wallet>>(INITIAL_WALLETS);
  
  // Restore user session from localStorage if available & token is not expired
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = getStoredToken();
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('fintech_user');
        removeStoredToken();
        return null;
      }
      const saved = localStorage.getItem('fintech_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'send' | 'history' | 'profile' | 'admin' | 'login' | 'register'>(() => {
    try {
      const token = getStoredToken();
      if (token && isTokenExpired(token)) return 'dashboard';
      const saved = localStorage.getItem('fintech_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'ADMIN' ? 'admin' : 'dashboard';
      }
    } catch {}
    return 'dashboard';
  });

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const updateActiveUser = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('fintech_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('fintech_user');
      removeStoredToken();
    }
  };
  
  // Processed Idempotency Keys store (W5)
  const [processedIdempotencyKeys, setProcessedIdempotencyKeys] = useState<Record<string, Transaction>>({});

  // Security Controls state — Default ALL controls ENABLED (Protected W1–W11)
  const [securityControls, setSecurityControls] = useState<SecurityControlState>({
    w1ObjectLevelAuth: true,
    w2ServerDerivedSender: true,
    w3Argon2idHashing: true,
    w4AtomicTransaction: true,
    w5IdempotencyKey: true,
    w6AuditLogging: true,
    w7Aes256Encryption: true,
    w8SantanderBulkExport: true,
    w9AccountKillSwitch: true,
    w10RateLimitStepUp: true,
    w11WebAuthnPasskeys: true,
    w8WebAuthnPasskeys: true,
  });

  // Fetch registered users, audit logs & active user balance from backend API on mount/user change
  useEffect(() => {
    apiService.getUsers().then(apiUsers => {
      if (apiUsers && apiUsers.length > 0) {
        setAllUsers(prev => {
          const map = new Map<string, User>();
          prev.forEach(u => map.set(u.email.toLowerCase(), u));
          apiUsers.forEach(u => map.set(u.email.toLowerCase(), u));
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

    apiService.getAdminLogs().then(logs => {
      if (logs && logs.length > 0) {
        setAuditLogs(prev => {
          const map = new Map<string, AuditLog>();
          logs.forEach((l: any) => map.set(l.id, l as any));
          prev.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
          return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
      }
    }).catch(() => {});

    if (user?.id) {
      apiService.getBalance(user.id).then(wb => {
        if (wb && wb.balance !== undefined) {
          setWallets(prev => ({ ...prev, [user.id]: { id: wb.id, userId: user.id, balance: wb.balance, currency: 'PKR' } }));
        }
      }).catch(() => {});

      apiService.getTransactions(user.id).then(txList => {
        if (txList) setTransactions(txList as any);
      }).catch(() => {});
    }
  }, [user?.id]);

  // Real-Time Block Enforcement Watcher: Automatically logs out any user whose account is blocked by Admin
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;

    const checkBlockStatus = async () => {
      try {
        const usersList = await apiService.getAdminUsers();
        const me = usersList.find((u: any) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
        if (me && me.isBlocked) {
          addAuditLog('SESSION_REVOKED_ACCOUNT_BLOCKED', 'FAILURE', `Session terminated: Account ${user.email} was suspended by Security Officer`);
          updateActiveUser(null);
          setActiveView('login');
          alert('ACCOUNT SUSPENDED: Your wallet account has been blocked by the Security Officer. You have been automatically logged out.');
        }
      } catch {}
    };

    checkBlockStatus();
    const interval = setInterval(checkBlockStatus, 2000);

    return () => clearInterval(interval);
  }, [user?.id, user?.email]);

  // Idle Inactivity Auto-Logout Control (15 Minutes of idle time)
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      // Auto logout after 15 minutes (900,000 ms) of user inactivity
      timer = setTimeout(() => {
        addAuditLog('SESSION_TIMEOUT_AUTO_LOGOUT', 'SUCCESS', `User ${user.email} auto-logged out due to 15m inactivity`);
        updateActiveUser(null);
        setActiveView('login');
      }, 15 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [user?.id]);

  const wallet = user ? wallets[user.id] || { id: `w-${user.id}`, userId: user.id, balance: 1000000, currency: 'PKR' } : null;

  const toggleSecurityControl = (key: keyof SecurityControlState) => {
    setSecurityControls(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addAuditLog = (action: string, result: 'SUCCESS' | 'FAILURE', details?: string) => {
    if (!securityControls.w6AuditLogging) return; // W6 disabled log suppression
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
      result,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const login = async (email: string, pass?: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Attempt live REST API login to verify password against Argon2id hash & check isBlocked status in DB
    if (pass) {
      try {
        const res = await apiService.login(email, pass);
        if (res && res.user) {
          const loggedUser: User = { ...res.user, role: res.user.email === 'admin@securewallet.io' ? 'ADMIN' : 'CUSTOMER' };
          updateActiveUser(loggedUser);
          if (loggedUser.role === 'ADMIN') {
            setActiveView('admin');
          } else {
            setActiveView('dashboard');
          }
          addAuditLog('AUTH_LOGIN_SUCCESS', 'SUCCESS', `User ${loggedUser.email} logged in via REST API`);

          apiService.getBalance(loggedUser.id).then(wb => {
            if (wb && wb.balance !== undefined) {
              setWallets(prev => ({ ...prev, [loggedUser.id]: { id: wb.id, userId: loggedUser.id, balance: wb.balance, currency: 'PKR' } }));
            }
          }).catch(() => {});

          apiService.getTransactions(loggedUser.id).then(txList => {
            if (txList) setTransactions(txList as any);
          }).catch(() => {});

          return { success: true };
        }
      } catch (err: any) {
        addAuditLog('AUTH_LOGIN_FAILED', 'FAILURE', `Login rejected for ${email}: ${err.message}`);
        return { success: false, message: err.message || 'Invalid email or password' };
      }
    }

    // 2. Fallback local user state checking
    const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      if ((foundUser as any).isBlocked) {
        addAuditLog('AUTH_LOGIN_BLOCKED_ACCOUNT', 'FAILURE', `Blocked account ${foundUser.email} attempted login`);
        return {
          success: false,
          message: 'Account Blocked: Your account has been suspended by the Security Officer. Please contact support.',
        };
      }

      updateActiveUser(foundUser);
      if (foundUser.role === 'ADMIN' || foundUser.email === 'admin@securewallet.io') {
        setActiveView('admin');
      } else {
        setActiveView('dashboard');
      }
      addAuditLog('AUTH_LOGIN_SUCCESS', 'SUCCESS', `User ${foundUser.email} (${foundUser.role || 'CUSTOMER'}) logged in successfully`);
      return { success: true };
    }

    addAuditLog('AUTH_LOGIN_FAILED', 'FAILURE', `Failed login attempt for ${email}`);
    return { success: false, message: 'Invalid credentials. Please verify your email and password.' };
  };

  const setAuthenticatedUser = (authUser: User, _token: string) => {
    updateActiveUser(authUser);
    if (authUser.role === 'ADMIN' || authUser.email === 'admin@securewallet.io') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
    addAuditLog('AUTH_WEBAUTHN_SUCCESS', 'SUCCESS', `User ${authUser.email} authenticated via WebAuthn Passkey`);

    apiService.getBalance(authUser.id).then(wb => {
      if (wb && wb.balance !== undefined) {
        setWallets(prev => ({ ...prev, [authUser.id]: { id: wb.id, userId: authUser.id, balance: wb.balance, currency: 'PKR' } }));
      }
    }).catch(() => {});

    apiService.getTransactions(authUser.id).then(txList => {
      if (txList) setTransactions(txList as any);
    }).catch(() => {});
  };

  const register = async (fullName: string, email: string, username: string, pass?: string, cnic?: string) => {
    const rawPass = pass || 'Password123!';

    try {
      // Call live NestJS API register endpoint to save User & Wallet in SQLite database
      const res = await apiService.register(fullName, email, username, rawPass, cnic);
      if (res && res.user) {
        const newUser: User = { ...res.user, role: 'CUSTOMER' };
        updateActiveUser(newUser);
        setWallets(prev => ({
          ...prev,
          [newUser.id]: { id: `w-${newUser.id}`, userId: newUser.id, accountNumber: res.user.accountNumber, balance: 1000000, currency: 'PKR' }
        }));

        const apiUsers = await apiService.getUsers().catch(() => []);
        if (apiUsers && apiUsers.length > 0) {
          setAllUsers(apiUsers);
        }

        const apiLogs = await apiService.getAdminLogs().catch(() => []);
        if (apiLogs && apiLogs.length > 0) {
          setAuditLogs(apiLogs as any);
        }

        setActiveView('dashboard');
        addAuditLog('AUTH_REGISTER_SUCCESS', 'SUCCESS', `Created real DB account & wallet for ${email}`);
        return true;
      }
    } catch (err: any) {
      console.warn('API Registration Error, using fallback:', err);
    }

    // Fallback local state creation if API fails
    const fallbackAccNo = `PK99SWAL${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newUser: User = {
      id: `usr-${Date.now()}`,
      fullName,
      email,
      username,
      cnic: cnic || '42101-9823412-1',
      accountNumber: fallbackAccNo,
      role: 'CUSTOMER',
    };
    const newWallet: Wallet = {
      id: `w-${Date.now()}`,
      userId: newUser.id,
      accountNumber: fallbackAccNo,
      balance: 1000000,
      currency: 'PKR',
    };
    setAllUsers(prev => {
      if (prev.some(u => u.email.toLowerCase() === email.toLowerCase())) return prev;
      return [...prev, newUser];
    });
    setWallets(prev => ({ ...prev, [newUser.id]: newWallet }));
    updateActiveUser(newUser);
    setActiveView('dashboard');
    addAuditLog('AUTH_REGISTER_SUCCESS', 'SUCCESS', `Created account & wallet for ${email}`);

    return true;
  };

  const logout = () => {
    addAuditLog('AUTH_LOGOUT', 'SUCCESS', `User ${user?.email} logged out`);
    updateActiveUser(null);
    setActiveView('login');
  };

  /**
   * Core Fund Transfer Engine handling W1, W2, W4, W5 controls.
   */
  const executeTransfer = async ({
    receiverEmail,
    amount,
    note,
    idempotencyKey,
    stepUpPassword,
    spoofedSenderId,
    targetUserIdOverride,
  }: {
    receiverEmail: string;
    amount: number;
    note?: string;
    idempotencyKey: string;
    stepUpPassword?: string;
    spoofedSenderId?: string;
    targetUserIdOverride?: string;
  }) => {
    if (!user) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    // W1 Check: Object-Level Authorization Guard (anti-BOLA)
    if (targetUserIdOverride && targetUserIdOverride !== user.id) {
      if (securityControls.w1ObjectLevelAuth) {
        addAuditLog('BOLA_ATTEMPT_BLOCKED', 'FAILURE', `User ${user.id} tried accessing user ${targetUserIdOverride}`);
        return { success: false, message: '403 Forbidden: OwnershipGuard rejected unauthorized cross-account operation (W1 BOLA Prevention).' };
      }
    }

    // W2 Check: Server-Derived Sender Identity Guard
    if (spoofedSenderId && spoofedSenderId !== user.id && securityControls.w2ServerDerivedSender) {
      addAuditLog('SENDER_SPOOF_BLOCKED', 'FAILURE', `User ${user.id} attempted to spoof sender ${spoofedSenderId}`);
    }

    // W5 Check: Client-side Idempotency Replay Check
    if (securityControls.w5IdempotencyKey && processedIdempotencyKeys[idempotencyKey]) {
      const existingTx = processedIdempotencyKeys[idempotencyKey];
      addAuditLog('TRANSFER_IDEMPOTENT_REPLAY', 'SUCCESS', `Replay request caught for key ${idempotencyKey}`);
      return {
        success: true,
        message: 'Idempotent response: Transaction was already processed previously (W5 Idempotency Control).',
        transaction: existingTx,
      };
    }

    // 1. Primary: Call live NestJS API executeTransfer endpoint ($transaction in SQLite DB)
    try {
      const res = await apiService.executeTransfer(receiverEmail, amount, note, idempotencyKey, stepUpPassword);
      if (res && res.success && res.transaction) {
        const tx: Transaction = res.transaction as any;
        setTransactions(prev => {
          if (prev.some(t => t.id === tx.id)) return prev;
          return [tx, ...prev];
        });

        // Refresh live balance from backend database
        apiService.getBalance(user.id).then(wb => {
          if (wb && wb.balance !== undefined) {
            setWallets(prev => ({ ...prev, [user.id]: { id: wb.id, userId: user.id, balance: wb.balance, currency: 'PKR' } }));
          }
        }).catch(() => {});

        addAuditLog('TRANSFER_EXECUTE_SUCCESS', 'SUCCESS', `Transferred ${amount} PKR to ${receiverEmail} via REST API`);
        return { success: true, message: res.message || 'Transfer completed successfully!', transaction: tx };
      } else if (res && !res.success) {
        if (res.message?.includes('Account Blocked')) {
          addAuditLog('SESSION_REVOKED_ACCOUNT_BLOCKED', 'FAILURE', `Account ${user.email} attempted action while blocked`);
          updateActiveUser(null);
          setActiveView('login');
          return { success: false, message: res.message };
        }
        addAuditLog('TRANSFER_EXECUTE_FAILED', 'FAILURE', res.message || 'Transfer failed');
        return { success: false, message: res.message || 'Transfer failed: Invalid recipient or insufficient balance.' };
      }
    } catch (err: any) {
      if (err.message?.includes('Account Blocked')) {
        addAuditLog('SESSION_REVOKED_ACCOUNT_BLOCKED', 'FAILURE', `Account ${user.email} attempted action while blocked`);
        updateActiveUser(null);
        setActiveView('login');
        return { success: false, message: err.message };
      }
      console.warn('API Transfer endpoint error, falling back to client simulation:', err);
    }

    // 2. Fallback: Local simulation state
    const senderWallet = wallets[user.id] || { id: `w-${user.id}`, userId: user.id, balance: 1000000, currency: 'PKR' };
    const receiverUser = allUsers.find(u => u.email.toLowerCase() === receiverEmail.toLowerCase());

    if (!receiverUser) {
      return { success: false, message: 'Transfer failed: Invalid recipient or insufficient balance.' };
    }

    if (senderWallet.userId === receiverUser.id) {
      return { success: false, message: 'Cannot transfer funds to your own wallet.' };
    }

    if (amount <= 0 || isNaN(amount)) {
      return { success: false, message: 'Validation Error: Transfer amount must be greater than zero.' };
    }

    if (senderWallet.balance < amount) {
      addAuditLog('TRANSFER_FAILED_INSUFFICIENT_FUNDS', 'FAILURE', `Attempted ${amount} PKR transfer with balance ${senderWallet.balance}`);
      return { success: false, message: 'Transfer failed: Insufficient wallet balance.' };
    }

    const receiverWalletId = `w-${receiverUser.id}`;
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      senderWalletId: senderWallet.id,
      senderName: user.fullName,
      senderEmail: user.email,
      receiverWalletId,
      receiverName: receiverUser.fullName,
      receiverEmail: receiverUser.email,
      amount,
      note,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
      idempotencyKey,
    };

    setWallets(prev => ({
      ...prev,
      [user.id]: {
        ...senderWallet,
        balance: senderWallet.balance - amount,
      },
      [receiverUser.id]: {
        id: receiverWalletId,
        userId: receiverUser.id,
        balance: (prev[receiverUser.id]?.balance || 1000) + amount,
        currency: 'PKR',
      },
    }));

    setTransactions(prev => [newTx, ...prev]);

    if (securityControls.w5IdempotencyKey) {
      setProcessedIdempotencyKeys(prev => ({ ...prev, [idempotencyKey]: newTx }));
    }

    addAuditLog('TRANSFER_EXECUTE_SUCCESS', 'SUCCESS', `Transferred ${amount} PKR to ${receiverEmail}`);
    return { success: true, message: 'Transfer completed successfully!', transaction: newTx };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        allUsers,
        transactions,
        auditLogs,
        securityControls,
        activeView,
        selectedTransaction,
        setActiveView,
        login,
        setAuthenticatedUser,
        register,
        logout,
        toggleSecurityControl,
        setSelectedTransaction,
        addAuditLog,
        executeTransfer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
