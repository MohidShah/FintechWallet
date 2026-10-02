/**
 * Frontend API Service for Mini Secure Fintech Wallet NestJS Backend
 * Handles HTTP authentication, bearer token management, and REST API calls.
 */

const API_BASE_URL = 'http://localhost:3000';

// Storage key for JWT token
const TOKEN_KEY = 'fintech_access_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const jsonStr = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (payload && typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
};

const getAuthHeaders = (idempotencyKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token && !isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (token && isTokenExpired(token)) {
    removeStoredToken();
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
};

export interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  username: string;
  cnic?: string;
  accountNumber?: string;
}

export interface ApiAuthResponse {
  user: ApiUser;
  accessToken: string;
}

export interface ApiWalletResponse {
  id: string;
  userId: string;
  balance: number;
  user: ApiUser;
}

export interface ApiTransactionResponse {
  id: string;
  senderWalletId: string;
  senderName: string;
  senderEmail: string;
  receiverWalletId: string;
  receiverName: string;
  receiverEmail: string;
  amount: number;
  note?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
  idempotencyKey?: string;
}

export interface ApiTransferResponse {
  success: boolean;
  message: string;
  transaction?: ApiTransactionResponse;
}

export const apiService = {
  // 1. Auth Login
  async login(email: string, pass: string): Promise<ApiAuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Invalid email or password');
    }

    const data: ApiAuthResponse = await res.json();
    setStoredToken(data.accessToken);
    return data;
  },

  // 2. Auth Register
  async register(fullName: string, email: string, username: string, pass: string, cnic?: string): Promise<ApiAuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, username, password: pass, cnic }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(err.message || 'Registration failed');
    }

    const data: ApiAuthResponse = await res.json();
    setStoredToken(data.accessToken);
    return data;
  },

  // 3. Get Wallet Balance
  async getBalance(userId: string): Promise<ApiWalletResponse> {
    const res = await fetch(`${API_BASE_URL}/wallet/balance/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch balance' }));
      throw new Error(err.message || 'Failed to fetch balance');
    }

    return res.json();
  },

  // 4. Execute Transfer
  async executeTransfer(
    receiverEmail: string,
    amount: number,
    note?: string,
    idempotencyKey?: string,
    stepUpPassword?: string
  ): Promise<ApiTransferResponse> {
    const key = idempotencyKey || `ik-${Date.now()}`;
    const res = await fetch(`${API_BASE_URL}/wallet/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(key),
      body: JSON.stringify({ receiverEmail, amount, note, stepUpPassword }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Transfer failed' }));
      return { success: false, message: err.message || 'Transfer failed' };
    }

    return res.json();
  },

  // 5. Get Transaction History
  async getTransactions(userId: string): Promise<ApiTransactionResponse[]> {
    const res = await fetch(`${API_BASE_URL}/wallet/transactions/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch transaction history' }));
      throw new Error(err.message || 'Failed to fetch transaction history');
    }

    return res.json();
  },

  // 6. Get All Users for Recipient Selection
  async getUsers(): Promise<ApiUser[]> {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
    });

    if (!res.ok) {
      return [];
    }

    return res.json();
  },

  // 7. Admin: Get Live Stats from Database
  async getAdminStats() {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, { method: 'GET' });
    if (!res.ok) return null;
    return res.json();
  },

  // 8. Admin: Get Users Directory with DB Balances
  async getAdminUsers() {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { method: 'GET' });
    if (!res.ok) return [];
    return res.json();
  },

  // 9. Admin: Get System Audit Stream from DB
  async getAdminLogs() {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, { method: 'GET' });
    if (!res.ok) return [];
    return res.json();
  },

  // 10. Admin: Get Global Transaction Ledger from DB
  async getAdminTransactions() {
    const res = await fetch(`${API_BASE_URL}/admin/transactions`, { method: 'GET' });
    if (!res.ok) return [];
    return res.json();
  },

  // 10b. Admin: Toggle Block/Freeze User Account
  async toggleBlockUser(userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/toggle-block`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to toggle account block state' }));
      throw new Error(err.message || 'Failed to toggle account block state');
    }
    return res.json();
  },

  // 11. WebAuthn Passkey Registration Options
  async getWebAuthnRegisterOptions() {
    const res = await fetch(`${API_BASE_URL}/auth/webauthn/register-options`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch registration options' }));
      throw new Error(err.message || 'Failed to fetch registration options');
    }
    return res.json();
  },

  // 12. Verify WebAuthn Registration
  async verifyWebAuthnRegistration(response: any) {
    const res = await fetch(`${API_BASE_URL}/auth/webauthn/register-verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(response),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to verify passkey registration' }));
      throw new Error(err.message || 'Failed to verify passkey registration');
    }
    return res.json();
  },

  // 13. WebAuthn Authentication Options
  async getWebAuthnLoginOptions(email?: string) {
    const res = await fetch(`${API_BASE_URL}/auth/webauthn/login-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch authentication options' }));
      throw new Error(err.message || 'Failed to fetch authentication options');
    }
    return res.json();
  },

  // 14. Verify WebAuthn Login
  async verifyWebAuthnLogin(response: any): Promise<ApiAuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/webauthn/login-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to verify passkey login' }));
      throw new Error(err.message || 'Failed to verify passkey login');
    }
    const data: ApiAuthResponse = await res.json();
    setStoredToken(data.accessToken);
    return data;
  },
};
