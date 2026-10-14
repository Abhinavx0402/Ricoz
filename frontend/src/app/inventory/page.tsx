'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  History,
  CheckCircle,
  X,
  ArrowDownRight,
  ArrowUpRight,
  Store as StoreIcon,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { InventoryItem, InventoryMovement } from '../../types';
import { api } from '../../lib/api';

export default function InventoryPage() {
  const { currentStore, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE' | 'RETURN'>('RESTOCK');
  const [quantityChange, setQuantityChange] = useState<string>('10');
  const [reason, setReason] = useState<string>('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdjust = hasRole(['ADMIN', 'MANAGER']);

  const loadStock = async () => {
    if (!currentStore) return;
    setIsLoading(true);
    try {
      const res: any = await api.get('/inventory', {
        storeId: currentStore._id,
        search,
        lowStockOnly: lowStockOnly ? 'true' : 'false',
      });
      if (res?.data?.items) {
        setItems(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load store inventory', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMovements = async () => {
    if (!currentStore) return;
    setIsLoading(true);
    try {
      const res: any = await api.get('/inventory/movements', {
        storeId: currentStore._id,
        limit: '100',
      });
      if (res?.data) {
        setMovements(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory movements', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stock') {
      loadStock();
    } else {
      loadMovements();
    }
  }, [currentStore, activeTab, search, lowStockOnly]);

  const openAdjustmentModal = (item: InventoryItem, defaultType: 'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE' = 'RESTOCK') => {
    setSelectedItem(item);
    setAdjustmentType(defaultType);
    setQuantityChange(defaultType === 'RESTOCK' ? '10' : '1');
    setReason('');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !currentStore) return;

    const parsedQty = parseInt(quantityChange, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setModalError('Quantity must be an integer greater than 0');
      return;
    }

    if (!reason.trim()) {
      setModalError('A reason is mandatory for auditable stock adjustments.');
      return;
    }

    // Determine sign: DAMAGE and negative adjustments reduce stock, RESTOCK adds stock
    const finalChange = adjustmentType === 'DAMAGE' ? -parsedQty : parsedQty;

    if (selectedItem.quantity + finalChange < 0) {
      setModalError(`Cannot reduce stock by ${parsedQty}. Current stock is ${selectedItem.quantity}.`);
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      await api.post('/inventory/adjustments', {
        storeId: currentStore._id,
        productId: selectedItem.productId,
        quantityChange: finalChange,
        movementType: adjustmentType,
        reason: reason.trim(),
      });

      setIsModalOpen(false);
      loadStock();
    } catch (err: any) {
      setModalError(err.message || 'Stock adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Store-Level Inventory
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Store: <strong className="text-neutral-800">{currentStore?.name}</strong> • Auditable movement ledger
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-neutral-200/60 p-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'stock'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stock Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'movements'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Movement Ledger</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Stock Overview */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by SKU, product name, or barcode..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setLowStockOnly(!lowStockOnly)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center space-x-1.5 ${
                    lowStockOnly
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Low Stock Only</span>
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="rounded-xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200/60">
                    <tr>
                      <th className="py-3 px-4">SKU / Barcode</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Available Stock</th>
                      <th className="py-3 px-4 text-center">Threshold</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {canAdjust && <th className="py-3 px-4 text-right">Adjust Stock</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-neutral-400">
                          No inventory records match your criteria.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-neutral-900">{item.sku}</span>
                            {item.barcode && (
                              <span className="block text-[10px] text-neutral-400">{item.barcode}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-neutral-900">{item.name}</td>
                          <td className="py-3 px-4 text-neutral-600">{item.categoryName}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-brand-900">
                            ${item.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded text-xs font-black ${
                                item.quantity <= 0
                                  ? 'bg-red-100 text-red-800 ring-1 ring-red-300'
                                  : item.isLowStock
                                  ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.quantity} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-500 font-mono">
                            {item.lowStockThreshold}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.isLowStock ? (
                              <span className="inline-flex items-center text-amber-700 font-bold gap-1 text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Low Stock</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-emerald-600 font-medium gap-1 text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Optimal</span>
                              </span>
                            )}
                          </td>
                          {canAdjust && (
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => openAdjustmentModal(item, 'RESTOCK')}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-bold"
                              >
                                + Restock
                              </button>
                              <button
                                onClick={() => openAdjustmentModal(item, 'DAMAGE')}
                                className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded text-[11px] font-bold"
                              >
                                - Damage
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Auditable Movement History Ledger */}
        {activeTab === 'movements' && (
          <div className="rounded-xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200/60">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4 text-center">Change</th>
                    <th className="py-3 px-4 text-center">New Balance</th>
                    <th className="py-3 px-4">Reason / Reference</th>
                    <th className="py-3 px-4">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-neutral-400">
                        No inventory movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const prod: any = m.productId;
                      const isNegative = m.quantityChange < 0;
                      return (
                        <tr key={m._id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.movementType === 'SALE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.movementType === 'RESTOCK'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.movementType === 'DAMAGE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {m.movementType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-neutral-900">{prod?.name || 'Item'}</p>
                            <p className="text-[10px] font-mono text-neutral-400">{prod?.sku}</p>
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            <span className={isNegative ? 'text-red-600' : 'text-emerald-600'}>
                              {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-neutral-800">
                            {m.newQuantity}
                          </td>
                          <td className="py-3 px-4 text-neutral-600">
                            <p>{m.reason}</p>
                            {m.referenceId && (
                              <p className="text-[10px] text-neutral-400 font-mono">Ref: {m.referenceId}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-neutral-700 font-medium whitespace-nowrap">
                            {m.actorName}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {isModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Adjust Inventory Stock</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{selectedItem.name} ({selectedItem.sku})</p>
                </div>
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

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Movement Type
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e: any) => setAdjustmentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  >
                    <option value="RESTOCK">Restock (Add units to inventory)</option>
                    <option value="DAMAGE">Shrinkage / Damage (Remove units)</option>
                    <option value="RETURN">Customer Return (Restock items)</option>
                    <option value="ADJUSTMENT">Cycle Count Audit Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Units Count to {adjustmentType === 'DAMAGE' ? 'Deduct' : 'Add'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantityChange}
                    onChange={(e) => setQuantityChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Current stock balance: <strong className="text-neutral-800">{selectedItem.quantity} units</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Reason for Adjustment (Mandatory for audit trail) *
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Received shipment PO-4091 or Damaged in transit"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  />
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
                    {isSubmitting ? 'Recording...' : 'Commit Movement'}
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
