'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Store as StoreIcon,
  UserCheck,
  Menu,
  X,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Store } from '../../types';
import { api } from '../../lib/api';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: Array<'ADMIN' | 'MANAGER' | 'CASHIER'>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { name: 'POS Checkout', href: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: 'Inventory', href: '/inventory', icon: Boxes, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Transactions', href: '/transactions', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: 'Staff & Roles', href: '/staff', icon: Users, roles: ['ADMIN'] },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, currentStore, logout, hasRole, isLoading, setCurrentStore } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      api.get<{ success: boolean; data: Store[] }>('/stores')
        .then((res) => {
          if (res.data) setAvailableStores(res.data);
        })
        .catch(() => {});
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-3 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-neutral-500">Loading RicozPOS...</p>
        </div>
      </div>
    );
  }

  const allowedNavItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200/80 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-800 ring-4 ring-brand-100" />
              <span className="font-bold text-xl tracking-tight text-neutral-900">
                Ricoz<span className="text-brand-800 font-extrabold">POS</span>
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-600 mt-0.5">
              Commerce & Digital Business
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-900 border-l-3 border-brand-800 font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-brand-800' : 'text-neutral-600'}`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Store Selector & User profile in sidebar footer */}
        <div className="p-4 border-t border-neutral-200/80 space-y-3">
          {/* Active Store pill */}
          <div className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <StoreIcon className="w-4 h-4 text-brand-800 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-neutral-800 truncate">
                    {currentStore?.name || 'Default Store'}
                  </p>
                  <p className="text-[10px] text-neutral-600">
                    Tax: {currentStore?.taxRate ?? 5.0}% • {currentStore?.currency || 'USD'}
                  </p>
                </div>
              </div>
              {hasRole(['ADMIN']) && availableStores.length > 1 && (
                <button
                  onClick={() => setIsStoreModalOpen(true)}
                  className="text-[10px] text-brand-800 font-semibold hover:underline shrink-0"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* User info & quick logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-900 truncate">{user.name}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : user.role === 'MANAGER'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-neutral-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-neutral-200/80 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                Store: {currentStore?.code || 'RCZ-01'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Cashier Switch Button */}
            <button
              onClick={() => router.push('/login?quickSwitch=true')}
              className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors"
              title="Switch cashier terminal via PIN"
            >
              <KeyRound className="w-3.5 h-3.5 text-brand-800" />
              <span>Switch Cashier</span>
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Store Switch Modal for Admins */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Switch Active Store</h3>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Select the retail location to scope POS inventory, sales, and registers:
            </p>
            <div className="space-y-2">
              {availableStores.map((st) => (
                <button
                  key={st._id}
                  onClick={() => {
                    setCurrentStore(st);
                    setIsStoreModalOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border text-sm font-medium transition-colors ${
                    currentStore?._id === st._id
                      ? 'border-brand-800 bg-brand-50 text-brand-900'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <p className="font-semibold">{st.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {st.code} • {st.address}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
