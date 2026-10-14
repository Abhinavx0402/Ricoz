'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store as StoreIcon,
  Save,
  CheckCircle,
  AlertCircle,
  Database,
  Shield,
  Layers,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export default function SettingsPage() {
  const { currentStore, setCurrentStore, user } = useAuth();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxRate, setTaxRate] = useState('5.0');
  const [currency, setCurrency] = useState('USD');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentStore) {
      setName(currentStore.name);
      setCode(currentStore.code);
      setAddress(currentStore.address);
      setPhone(currentStore.phone || '');
      setTaxRate(currentStore.taxRate.toString());
      setCurrency(currentStore.currency || 'USD');
    }
  }, [currentStore]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res: any = await api.patch(`/stores/${currentStore._id}`, {
        name,
        address,
        phone,
        taxRate: parseFloat(taxRate),
        currency,
      });

      if (res?.data) {
        setCurrentStore(res.data);
        setSuccessMsg('Store configurations saved successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update store settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            Store & System Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Physical retail location configuration, tax rules, and POS hardware parameters
          </p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Store Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-neutral-100">
            <StoreIcon className="w-5 h-5 text-brand-800" />
            <h3 className="text-sm font-bold text-neutral-900">Current Store Configuration</h3>
          </div>

          <form onSubmit={handleSaveStore} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Store Legal / Trading Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Store Identifier Code
                </label>
                <input
                  type="text"
                  disabled
                  value={code}
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Store Physical Address (Printed on Receipts) *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telephone Contact
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Default Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="100"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Updating Store...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* System Architecture Information Card */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-neutral-100">
            <Layers className="w-5 h-5 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">System Architecture & Runtime</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <p className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Frontend Stack</p>
              <p className="font-bold text-neutral-900">Next.js 14 (App Router) + Tailwind CSS</p>
              <p className="text-neutral-500 text-[11px]">Typography, Lucide Icons & Responsive Shell</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <p className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Backend Stack</p>
              <p className="font-bold text-neutral-900">Node.js + Express.js REST API</p>
              <p className="text-neutral-500 text-[11px]">Zod Schemas, JWT Auth, Atomic Operations</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <p className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Database Storage</p>
              <p className="font-bold text-neutral-900">MongoDB + Mongoose ODM</p>
              <p className="text-neutral-500 text-[11px]">Supports Mongo Atlas & In-Memory zero-config dev</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
              <p className="text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">Current Session</p>
              <p className="font-bold text-neutral-900">{user?.name} ({user?.role})</p>
              <p className="text-neutral-500 text-[11px] font-mono">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
