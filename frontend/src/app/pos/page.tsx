'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShoppingBag,
  X,
  Package,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { Product, CartItem, Sale, SaleItem } from '../../types';
import { api } from '../../lib/api';

export default function PosPage() {
  const { currentStore, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');

  // Checkout & Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI_QR'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Receipt Modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedItems, setCompletedItems] = useState<SaleItem[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Search input ref for quick keyboard focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load products and categories for current store
  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get<any>('/products', {
          storeId: currentStore?._id || '',
          active: 'true',
          limit: '100',
        }),
        api.get<any>('/categories'),
      ]);

      if (prodRes?.data?.products) {
        setProducts(prodRes.data.products);
      }
      if (catRes?.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Failed to load POS catalog', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore) {
      loadCatalog();
    }
  }, [currentStore]);

  // Barcode / Scanner Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on pressing '/' or 'F2'
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Handle direct barcode match in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      const exactMatch = products.find(
        (p) => p.barcode === q || p.sku.toUpperCase() === q
      );
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
      }
    }
  };

  const addToCart = (product: Product) => {
    const availableStock = product.stock ?? 0;
    if (availableStock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          alert(`Cannot add more. Only ${availableStock} units available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            const maxStock = item.product.stock ?? 0;
            if (newQty > maxStock) {
              alert(`Only ${maxStock} units available.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const taxRate = currentStore?.taxRate ?? 5.0;
  const subtotal = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  const taxAmount = Number(((subtotal * taxRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const parsedCash = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, Number((parsedCash - totalAmount).toFixed(2)));

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(totalAmount.toString());
    setCheckoutError('');
    setIsPaymentModalOpen(true);
  };

  const handleCompleteSale = async () => {
    if (!currentStore) return;
    if (paymentMethod === 'CASH' && parsedCash < totalAmount) {
      setCheckoutError(`Cash received ($${parsedCash.toFixed(2)}) is less than total ($${totalAmount.toFixed(2)})`);
      return;
    }

    setIsProcessing(true);
    setCheckoutError('');

    try {
      const payload = {
        storeId: currentStore._id,
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? parsedCash : totalAmount,
        customerName: customerName.trim() || 'Walk-in Customer',
        idempotencyKey: `pos-checkout-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };

      const res: any = await api.post('/sales', payload);

      if (res?.success) {
        setCompletedSale(res.data.sale);
        setCompletedItems(res.data.items);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        clearCart();
        loadCatalog(); // Refresh store stock
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7.5rem)]">
        {/* Left Column: Product Selection & Catalog */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          {/* Top Controls: Search Bar & Barcode scan hint */}
          <div className="p-4 border-b border-neutral-200/80 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Scan barcode or search product name / SKU (Press '/' or Enter)..."
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center px-3 py-2 rounded-lg bg-neutral-100 text-neutral-600 text-xs font-medium space-x-1 border border-neutral-200">
                <Barcode className="w-3.5 h-3.5" />
                <span>Scanner Active</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-brand-800 text-white font-semibold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Products
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCategory(c._id)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === c._id
                      ? 'bg-brand-800 text-white font-semibold'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand-800 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                <Package className="w-10 h-10 mb-2 stroke-1" />
                <p className="text-sm font-medium text-neutral-600">No products match your search</p>
                <p className="text-xs text-neutral-400 mt-1">Try another category or clear the search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const stock = p.stock ?? 0;
                  const isOutOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  return (
                    <button
                      key={p._id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      disabled={isOutOfStock}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isOutOfStock
                          ? 'border-neutral-200 bg-neutral-100/60 opacity-60 cursor-not-allowed'
                          : 'border-neutral-200/90 bg-white hover:border-brand-800 hover:shadow-xs active:scale-[0.98]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-neutral-400 truncate uppercase">
                            {p.sku}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {isOutOfStock ? '0 stock' : `${stock} left`}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100">
                        <span className="text-sm font-extrabold text-brand-900">
                          ${p.sellingPrice.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {p.categoryName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Register Cart & Instant Totals */}
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-brand-800" />
              <h3 className="text-sm font-bold text-neutral-900">Current Register</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 font-semibold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-neutral-400 hover:text-red-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Customer input */}
          <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200/60 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium">Customer:</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              className="bg-transparent text-right font-semibold text-neutral-800 focus:outline-none focus:border-b focus:border-brand-800"
            />
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                <ShoppingBag className="w-8 h-8 mb-2 stroke-1 text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-600">Register is empty</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Click or scan items to add to cart</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product._id}
                  className="p-2.5 rounded-lg border border-neutral-200/80 bg-white flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-800 truncate">{item.product.name}</p>
                    <p className="text-[10px] text-neutral-400">
                      ${item.product.sellingPrice.toFixed(2)} × {item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product._id, -1)}
                      className="w-6 h-6 rounded border border-neutral-300 hover:bg-neutral-100 flex items-center justify-center text-xs"
                    >
                      <Minus className="w-3 h-3 text-neutral-600" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product._id, 1)}
                      className="w-6 h-6 rounded border border-neutral-300 hover:bg-neutral-100 flex items-center justify-center text-xs"
                    >
                      <Plus className="w-3 h-3 text-neutral-600" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product._id)}
                      className="p-1 text-neutral-400 hover:text-red-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right shrink-0 min-w-14">
                    <span className="text-xs font-bold text-neutral-900">
                      ${(item.product.sellingPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout button */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200/80 space-y-2.5">
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({taxRate}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-200 text-sm font-extrabold text-neutral-900">
                <span>Payable Total</span>
                <span className="text-brand-900 text-base font-black">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleOpenCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              <span>Checkout (${totalAmount.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tender & Payment Processing Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Process Tender</h3>
                <p className="text-xs text-neutral-500">Total Due: <strong className="text-brand-900">${totalAmount.toFixed(2)}</strong></p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {checkoutError}
              </div>
            )}

            {/* Tender Options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === 'CARD'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Card Terminal</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI_QR')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                  paymentMethod === 'UPI_QR'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QR / UPI</span>
              </button>
            </div>

            {/* Cash Tender Calculation */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Cash Received
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-neutral-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                    />
                  </div>
                </div>

                {/* Quick Cash preset pills */}
                <div className="flex gap-1.5">
                  {[10, 20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashReceived(amt.toString())}
                      className="flex-1 py-1 rounded bg-white border border-neutral-300 text-xs font-semibold hover:bg-neutral-100"
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceived(totalAmount.toString())}
                    className="flex-1 py-1 rounded bg-brand-100 border border-brand-300 text-xs font-bold text-brand-900 hover:bg-brand-200"
                  >
                    Exact
                  </button>
                </div>

                {/* Change Due Display */}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 text-sm">
                  <span className="font-semibold text-neutral-700">Change Due:</span>
                  <span className="font-extrabold text-emerald-700 text-base">
                    ${changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-brand-800 mx-auto" />
                <p className="text-xs font-semibold text-neutral-800">EMV Chip / Contactless Terminal</p>
                <p className="text-[11px] text-neutral-500">Insert, swipe, or tap customer card on connected terminal.</p>
              </div>
            )}

            {paymentMethod === 'UPI_QR' && (
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-2">
                <QrCode className="w-16 h-16 text-neutral-800 mx-auto p-1 bg-white border rounded-lg" />
                <p className="text-xs font-semibold text-neutral-800">Scan to Pay ${totalAmount.toFixed(2)}</p>
                <p className="text-[11px] text-neutral-500">Supports UPI, Apple Pay, Google Pay, and retail QR.</p>
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-sm font-bold shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isProcessing ? 'Processing Transaction...' : 'Complete & Authorize Sale'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-1.5 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">Sale Completed</span>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Thermal Receipt Container */}
            <div
              id="printable-receipt"
              className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs space-y-3"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-neutral-300 pb-2">
                <h4 className="font-extrabold text-sm uppercase text-neutral-900">
                  {currentStore?.name || 'Ricoz Store'}
                </h4>
                <p className="text-[10px] text-neutral-500">{currentStore?.address || 'Retail Center'}</p>
                <p className="text-[10px] text-neutral-500">Tel: {currentStore?.phone || '+1 (555) 019-2834'}</p>
                <p className="text-[10px] font-bold text-neutral-700 mt-1">
                  TXN: {completedSale.transactionNumber}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {new Date(completedSale.createdAt).toLocaleString()} • Cashier: {completedSale.cashierName}
                </p>
              </div>

              {/* Line Items */}
              <div className="space-y-1.5 border-b border-dashed border-neutral-300 pb-2">
                {completedItems.map((item, idx) => (
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
                ))}
              </div>

              {/* Receipt Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal:</span>
                  <span>${completedSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tax:</span>
                  <span>${completedSale.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs text-neutral-900 pt-1 border-t border-neutral-200">
                  <span>TOTAL:</span>
                  <span>${completedSale.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 pt-1">
                  <span>Tender: {completedSale.paymentMethod}</span>
                  <span>${(completedSale.cashReceived ?? completedSale.totalAmount).toFixed(2)}</span>
                </div>
                {completedSale.paymentMethod === 'CASH' && (
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Change Due:</span>
                    <span>${(completedSale.changeDue ?? 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-neutral-300 text-[9px] text-neutral-400">
                Thank you for shopping with Ricoz!
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
                className="flex-1 py-2.5 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold transition-colors"
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
