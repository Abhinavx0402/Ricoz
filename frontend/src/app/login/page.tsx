'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickSwitch = searchParams.get('quickSwitch') === 'true';

  const { login, pinLogin } = useAuth();
  const [authMode, setAuthMode] = useState<'password' | 'pin'>(quickSwitch ? 'pin' : 'password');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      setError('Please enter a valid 4-digit cashier PIN.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await pinLogin(pin);
      router.push('/pos');
    } catch (err: any) {
      setError(err.message || 'Invalid cashier PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setPin('');
    } else if (val === 'BACK') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 8) {
        setPin((prev) => prev + val);
      }
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'cashier') => {
    if (role === 'admin') {
      setEmail('admin@ricozpos.com');
      setPassword('password123');
      setPin('9999');
    } else if (role === 'manager') {
      setEmail('manager@ricozpos.com');
      setPassword('password123');
      setPin('8888');
    } else {
      setEmail('cashier@ricozpos.com');
      setPassword('password123');
      setPin('1234');
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200/80 rounded-2xl sm:px-10">
      {/* Tab selector: Email vs Quick PIN */}
      <div className="flex rounded-lg bg-neutral-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => {
            setAuthMode('password');
            setError('');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            authMode === 'password'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('pin');
            setError('');
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            authMode === 'pin'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Cashier Quick PIN
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {authMode === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. cashier@ricozpos.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div className="text-center">
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Enter Cashier PIN
            </label>
            <div className="h-12 flex items-center justify-center space-x-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    pin.length > idx
                      ? 'bg-brand-800 border-brand-800 ring-2 ring-brand-100'
                      : 'border-neutral-300 bg-white'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* On-screen Terminal NumPad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleKeypadPress(val)}
                className="h-11 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-sm font-bold text-neutral-800 shadow-xs transition-colors flex items-center justify-center"
              >
                {val === 'BACK' ? '⌫' : val}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || pin.length < 4}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Verifying PIN...' : 'Open Terminal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Seed Account Quick Switch helper for reviewers */}
      <div className="mt-6 pt-5 border-t border-neutral-100">
        <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-center mb-2.5">
          Quick Test Credentials:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="px-2 py-1.5 rounded border border-purple-200 bg-purple-50 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 transition-colors"
          >
            Admin (9999)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('manager')}
            className="px-2 py-1.5 rounded border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
          >
            Manager (8888)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('cashier')}
            className="px-2 py-1.5 rounded border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            Cashier (1234)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-neutral-100/60">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center space-x-2.5 mb-2">
          <span className="w-3.5 h-3.5 rounded-full bg-brand-800 ring-4 ring-brand-100" />
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Ricoz<span className="text-brand-800">POS</span>
          </h1>
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
          Commerce & Digital Business Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-400">Loading terminal...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
