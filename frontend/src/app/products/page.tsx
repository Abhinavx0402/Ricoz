'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Barcode,
  X,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { Product, Category } from '../../types';
import { api } from '../../lib/api';

export default function ProductsPage() {
  const { currentStore, hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageProducts = hasRole(['ADMIN', 'MANAGER']);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get<any>('/products', {
          search,
          categoryId: selectedCategory,
          active: activeFilter,
          storeId: currentStore?._id || '',
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
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentStore, search, selectedCategory, activeFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setBarcode('');
    setCategoryId(categories[0]?._id || '');
    setDescription('');
    setSellingPrice('');
    setCostPrice('');
    setTaxRate('');
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setCategoryId(p.categoryId);
    setDescription(p.description || '');
    setSellingPrice(p.sellingPrice.toString());
    setCostPrice(p.costPrice !== undefined ? p.costPrice.toString() : '');
    setTaxRate(p.taxRate !== undefined && p.taxRate !== null ? p.taxRate.toString() : '');
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const parsedSelling = parseFloat(sellingPrice);
    if (isNaN(parsedSelling) || parsedSelling <= 0) {
      setModalError('Selling price must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name,
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || null,
        categoryId,
        description,
        sellingPrice: parsedSelling,
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        taxRate: taxRate ? parseFloat(taxRate) : null,
      };

      if (editingProduct) {
        await api.patch(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProductActive = async (product: Product) => {
    if (!confirm(`Are you sure you want to ${product.active ? 'deactivate' : 'reactivate'} '${product.name}'?`)) {
      return;
    }
    try {
      await api.patch(`/products/${product._id}`, { active: !product.active });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update product status');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              Product Catalog & Prices
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Central catalog management • Soft deactivation preserves historical transactions
            </p>
          </div>
          {canManageProducts && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Product</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or barcode..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200/60">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  {canManageProducts && <th className="py-3 px-4 text-right">Cost Price</th>}
                  <th className="py-3 px-4 text-center">Store Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManageProducts && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-neutral-400">
                      No products found matching your filters.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-neutral-900">{p.sku}</span>
                        {p.barcode && (
                          <span className="block text-[10px] text-neutral-400">
                            {p.barcode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-neutral-900">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-neutral-400 line-clamp-1">{p.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{p.categoryName}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-brand-900">
                        ${p.sellingPrice.toFixed(2)}
                      </td>
                      {canManageProducts && (
                        <td className="py-3 px-4 text-right text-neutral-500 font-mono">
                          ${(p.costPrice ?? 0).toFixed(2)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            (p.stock ?? 0) <= 0
                              ? 'bg-red-100 text-red-700'
                              : (p.stock ?? 0) <= 5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock ?? 0} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.active ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-neutral-400 font-semibold gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      {canManageProducts && (
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 text-neutral-500 hover:text-brand-800 rounded hover:bg-neutral-100"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleProductActive(p)}
                            className={`p-1 rounded hover:bg-neutral-100 ${
                              p.active ? 'text-neutral-400 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'
                            }`}
                            title={p.active ? 'Deactivate Product' : 'Reactivate Product'}
                          >
                            {p.active ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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

        {/* Create/Edit Product Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingProduct ? 'Edit Catalog Product' : 'Create New Product'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Single Origin French Roast (16oz)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      SKU (Unique Code) *
                    </label>
                    <input
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. COF-001"
                      className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Barcode / UPC
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 89012345001"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="19.99"
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Cost Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="8.50"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="Store default"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-800/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short product notes..."
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
                    {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
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
