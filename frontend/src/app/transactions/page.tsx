'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  X,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { Sale, SaleItem } from '../../types';
import { api } from '../../lib/api';

export default function TransactionsPage() {
  const { currentStore } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Transaction Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get('/sales', {
        storeId: currentStore?._id || '',
        search,
        paymentMethod,
        startDate,
        endDate,
        limit: '50',
      });
      if (res?.data?.sales) {
        setSales(res.data.sales);
      }
    } catch (err) {
      console.error('Failed to load sales transactions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [currentStore, search, paymentMethod, startDate, endDate]);

  const viewReceipt = async (sale: Sale) => {
    setSelectedSale(sale);
    setIsLoadingReceipt(true);
    setIsReceiptModalOpen(true);
    try {
      const res: any = await api.get(`/sales/${sale._id}`);
      if (res?.data?.items) {
        setSelectedItems(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load transaction details', err);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Transaction History & Receipts
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Store: <strong className="text-neutral-800">{currentStore?.name}</strong> • Immutable historical financial records
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction number (e.g. TXN-20261015)..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="">All Tenders</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI_QR">QR / UPI</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-neutral-300 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            />

            {(search || paymentMethod || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearch('');
                  setPaymentMethod('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="py-2 px-3 text-xs font-semibold text-neutral-500 hover:text-neutral-800 border rounded-lg"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200/60">
                <tr>
                  <th className="py-3 px-4">Transaction #</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Tender</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-neutral-400">
                      No transactions recorded matching the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        {sale.transactionNumber}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-800">{sale.cashierName}</td>
                      <td className="py-3 px-4 text-neutral-600">{sale.customerName || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-neutral-700">
                        {sale.itemCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-brand-900">
                        ${sale.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => viewReceipt(sale)}
                          className="px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-900 font-bold text-[11px] inline-flex items-center gap-1 border border-brand-200"
                        >
                          <Printer className="w-3 h-3" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receipt Modal */}
        {isReceiptModalOpen && selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center space-x-1.5 text-neutral-900">
                  <Receipt className="w-5 h-5 text-brand-800" />
                  <span className="text-sm font-bold">Transaction Receipt</span>
                </div>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Content */}
              <div
                id="printable-receipt"
                className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs space-y-3"
              >
                <div className="text-center space-y-0.5 border-b border-dashed border-neutral-300 pb-2">
                  <h4 className="font-extrabold text-sm uppercase text-neutral-900">
                    {currentStore?.name || 'Ricoz Store'}
                  </h4>
                  <p className="text-[10px] text-neutral-500">{currentStore?.address}</p>
                  <p className="text-[10px] text-neutral-500">Tel: {currentStore?.phone}</p>
                  <p className="text-[10px] font-bold text-neutral-700 mt-1">
                    TXN: {selectedSale.transactionNumber}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {new Date(selectedSale.createdAt).toLocaleString()} • Cashier: {selectedSale.cashierName}
                  </p>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-neutral-300 pb-2">
                  {isLoadingReceipt ? (
                    <p className="text-center py-4 text-neutral-400">Loading itemized receipt...</p>
                  ) : (
                    selectedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[11px]">
                        <div className="truncate pr-2">
                          <p className="font-bold text-neutral-800">{item.productName}</p>
                          <p className="text-[9px] text-neutral-500">
                            {item.quantity} × ${item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-neutral-900 shrink-0">
                          ${item.total.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal:</span>
                    <span>${selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax:</span>
                    <span>${selectedSale.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-neutral-900 pt-1 border-t border-neutral-200">
                    <span>TOTAL:</span>
                    <span>${selectedSale.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600 pt-1">
                    <span>Tender: {selectedSale.paymentMethod}</span>
                    <span>${(selectedSale.cashReceived ?? selectedSale.totalAmount).toFixed(2)}</span>
                  </div>
                  {selectedSale.paymentMethod === 'CASH' && (
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Change:</span>
                      <span>${(selectedSale.changeDue ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2 border-t border-dashed border-neutral-300 text-[9px] text-neutral-400">
                  Customer Copy • RicozPOS
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
