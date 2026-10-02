import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, Lock, Mail, ArrowRight, ShieldAlert, ShieldCheck, User, Fingerprint } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { apiService } from '../../services/api';

export const LoginView: React.FC = () => {
  const { login, setAuthenticatedUser, setActiveView, securityControls } = useAuth();
  const [portalMode, setPortalMode] = useState<'customer' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const handlePortalSwitch = (mode: 'customer' | 'admin') => {
    setPortalMode(mode);
    setErrorMessage('');
    if (mode === 'admin') {
      setEmail('admin@securewallet.io');
      setPassword('Password123!');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setErrorMessage('');
    try {
      const options = await apiService.getWebAuthnLoginOptions(email.trim() || undefined);
      const authResponse = await startAuthentication({ optionsJSON: options });
      const verifyRes = await apiService.verifyWebAuthnLogin(authResponse);
      if (verifyRes && verifyRes.user && verifyRes.accessToken) {
        const loggedUser = {
          ...verifyRes.user,
          role: verifyRes.user.email === 'admin@securewallet.io' ? ('ADMIN' as const) : ('CUSTOMER' as const),
        };
        setAuthenticatedUser(loggedUser, verifyRes.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Passkey authentication failed or was cancelled.');
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8">
        
        {/* Portal Mode Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handlePortalSwitch('customer')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              portalMode === 'customer'
                ? 'bg-white text-blue-600 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer Login</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch('admin')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              portalMode === 'admin'
                ? 'bg-slate-900 text-amber-400 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center mx-auto mb-3 shadow-lg transition-all ${
            portalMode === 'admin' ? 'bg-slate-900 shadow-slate-900/30' : 'bg-blue-600 shadow-blue-500/25'
          }`}>
            {portalMode === 'admin' ? <ShieldCheck className="w-6 h-6 text-amber-400" /> : <Wallet className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {portalMode === 'admin' ? 'Security Officer Portal' : 'Customer Wallet Portal'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {portalMode === 'admin' 
              ? 'Centralized System Audit, User Directory & Threat Oversight' 
              : 'Log in to access your secure personal wallet'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {portalMode === 'admin' ? 'Administrator Email' : 'Customer Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Password (Argon2id)</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
            portalMode === 'admin' 
              ? 'bg-slate-900 text-slate-200 border-slate-800' 
              : 'bg-blue-50/60 text-blue-800 border-blue-100'
          }`}>
            <span className="font-semibold block">
              {portalMode === 'admin' ? 'System Administrator Portal:' : 'Real User Login:'}
            </span>
            {portalMode === 'customer' ? (
              <p className="text-[11px] text-blue-700 font-sans">
                Register a new customer account below or log in with your registered email & password.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setEmail('admin@securewallet.io'); setPassword('Password123!'); }}
                  className="px-2 py-0.5 bg-amber-400 text-slate-950 font-bold rounded font-mono text-[10px] hover:bg-amber-300"
                >
                  admin@securewallet.io (Admin Role)
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`w-full py-3 text-white font-semibold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2 ${
              portalMode === 'admin'
                ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            <span>{portalMode === 'admin' ? 'Log In to Admin Panel' : 'Log In to Personal Wallet'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {portalMode === 'customer' && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">or use passkey</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {securityControls.w8WebAuthnPasskeys ? (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isPasskeyLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>{isPasskeyLoading ? 'Authenticating Passkey...' : 'Sign in with Biometrics / Passkey (WebAuthn)'}</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-center font-sans font-semibold">
                  ⚠️ WebAuthn Control Disabled in Security Demo Panel (BEFORE Mode)
                </div>
              )}
            </>
          )}
        </form>

        {/* Register Link */}
        {portalMode === 'customer' && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have a wallet account?{' '}
              <button
                onClick={() => setActiveView('register')}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Create Customer Account
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
