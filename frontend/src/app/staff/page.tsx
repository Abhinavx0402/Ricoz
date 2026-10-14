'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  KeyRound,
  CheckCircle,
  XCircle,
  Edit2,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { Store } from '../../types';
import { api } from '../../lib/api';

export default function StaffPage() {
  const { hasRole, user: currentUser } = useAuth();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [storeId, setStoreId] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, storeRes] = await Promise.all([
        api.get<any>('/staff'),
        api.get<any>('/stores'),
      ]);
      if (staffRes?.data) setStaffList(staffRes.data);
      if (storeRes?.data) {
        setStores(storeRes.data);
        if (!storeId && storeRes.data[0]) setStoreId(storeRes.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load staff list', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPassword('');
    setPin('');
    setRole('CASHIER');
    setStoreId(stores[0]?._id || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (staff: any) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setPassword('');
    setPin('');
    setRole(staff.role);
    setStoreId(staff.storeId?._id || staff.storeId || '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsSubmitting(true);

    try {
      const payload: any = {
        name,
        email,
        role,
        storeId: role === 'ADMIN' ? null : storeId,
      };

      if (password) payload.password = password;
      if (pin) payload.pin = pin;

      if (editingStaff) {
        await api.patch(`/staff/${editingStaff._id}`, payload);
      } else {
        if (!password) {
          setModalError('Password is required for new staff accounts.');
          setIsSubmitting(false);
          return;
        }
        await api.post('/staff', payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStaffActive = async (staff: any) => {
    if (!confirm(`Are you sure you want to ${staff.active ? 'deactivate' : 'reactivate'} '${staff.name}'?`)) {
      return;
    }
    try {
      await api.patch(`/staff/${staff._id}`, { active: !staff.active });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Staff & Permission Management
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Role-Based Access Control (RBAC) • Quick cashier terminal PIN management
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        </div>

        {/* Staff Table */}
        <div className="rounded-xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200/60">
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned Store</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-400">
                      No staff accounts found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((st) => (
                    <tr key={st._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">{st.name}</td>
                      <td className="py-3 px-4 text-neutral-600 font-mono">{st.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : st.role === 'MANAGER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {st.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {st.role === 'ADMIN' ? 'All Stores (Global)' : st.storeId?.name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {st.active ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold gap-1 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-neutral-400 font-semibold gap-1 text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1 text-neutral-500 hover:text-brand-800 rounded hover:bg-neutral-100"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.id !== st._id && (
                          <button
                            onClick={() => toggleStaffActive(st)}
                            className={`p-1 rounded hover:bg-neutral-100 ${
                              st.active ? 'text-neutral-400 hover:text-red-700' : 'text-emerald-600'
                            }`}
                            title={st.active ? 'Deactivate' : 'Reactivate'}
                          >
                            {st.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingStaff ? 'Edit Staff Account' : 'Create Staff Member'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex@ricozpos.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {editingStaff ? 'Password (blank to keep)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Cashier PIN (4-8 digits)
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Role *</label>
                    <select
                      value={role}
                      onChange={(e: any) => setRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    >
                      <option value="CASHIER">CASHIER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Assigned Store</label>
                    <select
                      disabled={role === 'ADMIN'}
                      value={storeId}
                      onChange={(e) => setStoreId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20 disabled:bg-neutral-100"
                    >
                      {stores.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
