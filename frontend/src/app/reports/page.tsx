'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Receipt,
  Users,
  CreditCard,
  Banknote,
  QrCode,
  Filter,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

export default function ReportsPage() {
  const { currentStore } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/reports/sales', {
        storeId: currentStore?._id || '',
        startDate,
        endDate,
      });
      if (res?.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load sales report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [currentStore, startDate, endDate]);

  const handleExportCsv = () => {
    const token = localStorage.getItem('ricoz_pos_token');
    const storeParam = currentStore ? `&storeId=${currentStore._id}` : '';
    const dateParams = `${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/reports/sales?format=csv${storeParam}${dateParams}`;

    // Trigger download with auth token header or fetch blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `ricozpos-sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert('Export failed: ' + err.message));
  };

  const paymentBreakdown = reportData?.paymentBreakdown || [];
  const cashierBreakdown = reportData?.cashierBreakdown || [];
  const totalRevenue = reportData?.totalRevenue || 0;
  const totalSalesCount = reportData?.totalSalesCount || 0;

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Sales Reports & Financial Summaries
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Store: <strong className="text-neutral-800">{currentStore?.name}</strong> • Validated ledger aggregations
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-brand-800" />
            <span>Export Sanitized CSV</span>
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="py-1.5 px-3 text-xs font-semibold text-neutral-500 hover:text-neutral-800 border rounded-lg"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Gross Filtered Revenue</p>
              <h3 className="text-3xl font-black text-brand-900 mt-1">
                ${totalRevenue.toFixed(2)}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">Across completed transactions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total In-Person Sales</p>
              <h3 className="text-3xl font-black text-neutral-900 mt-1">
                {totalSalesCount}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Avg transaction: ${totalSalesCount > 0 ? (totalRevenue / totalSalesCount).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2-Column: Tender Breakdown & Cashier Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tender Type Breakdown */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Payment Tender Distribution</h3>
            <div className="divide-y divide-neutral-100">
              {paymentBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No payment data for this period.</p>
              ) : (
                paymentBreakdown.map((pb: any) => {
                  const percent = totalRevenue > 0 ? Math.round((pb.revenue / totalRevenue) * 100) : 0;
                  return (
                    <div key={pb._id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                          {pb._id === 'CASH' ? (
                            <Banknote className="w-4 h-4" />
                          ) : pb._id === 'CARD' ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <QrCode className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900">{pb._id}</p>
                          <p className="text-[10px] text-neutral-400">{pb.count} sales</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-brand-900">${pb.revenue.toFixed(2)}</p>
                        <p className="text-[10px] text-neutral-500 font-semibold">{percent}% of total</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cashier Performance Breakdown */}
          <div className="p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Cashier Sales Performance</h3>
            <div className="divide-y divide-neutral-100">
              {cashierBreakdown.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">No cashier data for this period.</p>
              ) : (
                cashierBreakdown.map((cb: any) => (
                  <div key={cb._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-800 font-bold text-xs flex items-center justify-center">
                        {cb.cashierName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900">{cb.cashierName}</p>
                        <p className="text-[10px] text-neutral-400">{cb.count} transactions completed</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-brand-900">${cb.revenue.toFixed(2)}</p>
                      <p className="text-[10px] text-neutral-500 font-semibold">
                        Avg: ${(cb.revenue / cb.count).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
