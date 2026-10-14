'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const { currentStore, hasRole } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/reports/dashboard', {
        storeId: currentStore?._id || '',
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [currentStore]);

  const metrics = data?.metrics || {
    todayRevenue: 0,
    todayTransactions: 0,
    averageTicket: 0,
    totalProducts: 0,
    lowStockCount: 0,
  };

  const recentTransactions = data?.recentTransactions || [];
  const topProducts = data?.topProducts || [];
  const lowStockAlerts = data?.lowStockAlerts || [];
  const salesOverTime = data?.salesOverTime || [];

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Title & Context */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Retail Operations Dashboard
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Store: <strong className="text-neutral-800">{currentStore?.name || 'All Locations'}</strong> • Real-time database metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/pos"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open POS Register</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Today's Sales</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1">
                ${metrics.todayRevenue.toFixed(2)}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Avg. ticket: ${metrics.averageTicket.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Transactions Count */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Completed Orders</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1">
                {metrics.todayTransactions}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Real transactions today
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          {/* Active Products */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Active Catalog SKUs</p>
              <h3 className="text-2xl font-black text-neutral-900 mt-1">
                {metrics.totalProducts}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Across physical stores
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className={`text-2xl font-black mt-1 ${metrics.lowStockCount > 0 ? 'text-amber-700' : 'text-neutral-900'}`}>
                {metrics.lowStockCount}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Items ≤ threshold limit
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              metrics.lowStockCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2-Column Section: 7-Day Trend & Low-Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales History Bars */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">7-Day Sales Trend</h3>
                <p className="text-xs text-neutral-400">Daily gross revenue across completed sales</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 rounded text-neutral-600">
                Live Data
              </span>
            </div>

            {salesOverTime.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-neutral-400 text-xs">
                No transactions recorded yet in the last 7 days.
              </div>
            ) : (
              <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-neutral-100">
                {salesOverTime.map((d: any) => {
                  const maxRev = Math.max(...salesOverTime.map((x: any) => x.revenue), 1);
                  const heightPercent = Math.max(10, Math.round((d.revenue / maxRev) * 100));
                  return (
                    <div key={d._id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[10px] font-bold text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${d.revenue.toFixed(0)}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-brand-800/80 hover:bg-brand-900 rounded-t-md transition-all duration-300"
                      />
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {d._id.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top-Selling Products */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">Top-Selling Products</h3>
              <span className="text-xs text-brand-800 font-semibold">By Volume</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {topProducts.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No sales history yet.</p>
              ) : (
                topProducts.map((tp: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-neutral-800 truncate">{tp.name}</p>
                      <p className="text-[10px] font-mono text-neutral-400">{tp.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-neutral-900">{tp.totalUnitsSold} units</p>
                      <p className="text-[10px] text-neutral-500">${tp.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Recent Transactions</h3>
              <p className="text-xs text-neutral-400">Latest completed counter sales</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-brand-800 hover:underline flex items-center gap-0.5"
            >
              <span>View All Transactions</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-y border-neutral-200/60">
                <tr>
                  <th className="py-2.5 px-3">Transaction #</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Payment</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-400">
                      No recent sales found. Complete a checkout in the POS to view records here.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx: any) => (
                    <tr key={tx._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-neutral-800">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 font-medium">
                        {tx.cashierName}
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-600">{tx.itemCount} items</td>
                      <td className="py-3 px-3 text-right font-black text-brand-900">
                        ${tx.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
