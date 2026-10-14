import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Sale } from '../models/Sale.js';
import { SaleItem } from '../models/SaleItem.js';
import { Product } from '../models/Product.js';
import { StoreInventory } from '../models/StoreInventory.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { fromCents, toCents } from '../utils/money.js';

export async function getDashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = req.query as Record<string, string>;
    const effectiveStoreId = storeId || (req.user?.role !== 'ADMIN' ? req.user?.storeId : undefined);

    const matchFilter: any = { paymentStatus: 'COMPLETED' };
    if (effectiveStoreId) {
      matchFilter.storeId = new mongoose.Types.ObjectId(effectiveStoreId.toString());
    }

    // Today's date range (midnight to now)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayFilter = {
      ...matchFilter,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    // 1. Today's Sales Aggregation
    const [todaySalesAgg] = await Sale.aggregate([
      { $match: todayFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const todayRevenue = todaySalesAgg ? Number(todaySalesAgg.totalRevenue.toFixed(2)) : 0;
    const todayTransactions = todaySalesAgg ? todaySalesAgg.transactionCount : 0;
    const avgTicket = todayTransactions > 0 ? Number((todayRevenue / todayTransactions).toFixed(2)) : 0;

    // 2. Product & Inventory Counts
    const totalProducts = await Product.countDocuments({ active: true });

    // Low stock count
    const invMatch: any = {};
    if (effectiveStoreId) {
      invMatch.storeId = new mongoose.Types.ObjectId(effectiveStoreId.toString());
    }
    const lowStockItems = await StoreInventory.aggregate([
      { $match: invMatch },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          quantity: 1,
          lowStockThreshold: 1,
          productName: '$product.name',
          sku: '$product.sku',
          isLowStock: { $lte: ['$quantity', '$lowStockThreshold'] },
        },
      },
      { $match: { isLowStock: true } },
    ]);

    // 3. Recent Transactions
    const recentSales = await Sale.find(matchFilter)
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // 4. Sales Over Last 7 Days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesOverTime = await Sale.aggregate([
      {
        $match: {
          ...matchFilter,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5. Top-selling items (top 5)
    const topProducts = await SaleItem.aggregate([
      {
        $group: {
          _id: '$productId',
          name: { $first: '$productName' },
          sku: { $first: '$sku' },
          totalUnitsSold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$total' },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          todayRevenue,
          todayTransactions,
          averageTicket: avgTicket,
          totalProducts,
          lowStockCount: lowStockItems.length,
        },
        recentTransactions: recentSales,
        salesOverTime,
        topProducts,
        lowStockAlerts: lowStockItems.slice(0, 5),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getSalesReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId, startDate, endDate, format } = req.query as Record<string, string>;
    const effectiveStoreId = storeId || (req.user?.role !== 'ADMIN' ? req.user?.storeId : undefined);

    const filter: any = { paymentStatus: 'COMPLETED' };
    if (effectiveStoreId) filter.storeId = new mongoose.Types.ObjectId(effectiveStoreId.toString());

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Payment method breakdown
    const paymentBreakdown = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Cashier breakdown
    const cashierBreakdown = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$cashierId',
          cashierName: { $first: '$cashierName' },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // List of sales for the report
    const salesList = await Sale.find(filter)
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Check for CSV export
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');

      // CSV Formula Injection Sanitization Helper
      const sanitizeCsvField = (val: any) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        if (/^[=\+\-@\t\r]/.test(str)) {
          str = `'${str}`;
        }
        return `"${str}"`;
      };

      const headers = ['Transaction Number', 'Date', 'Store', 'Cashier', 'Payment Method', 'Items', 'Total'];
      const rows = salesList.map((s: any) => [
        sanitizeCsvField(s.transactionNumber),
        sanitizeCsvField(new Date(s.createdAt).toISOString()),
        sanitizeCsvField(s.storeId?.name || 'N/A'),
        sanitizeCsvField(s.cashierName),
        sanitizeCsvField(s.paymentMethod),
        sanitizeCsvField(s.itemCount),
        sanitizeCsvField(s.totalAmount.toFixed(2)),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.send(csvContent);
      return;
    }

    res.json({
      success: true,
      data: {
        paymentBreakdown,
        cashierBreakdown,
        totalSalesCount: salesList.length,
        totalRevenue: Number(salesList.reduce((acc, s) => acc + s.totalAmount, 0).toFixed(2)),
      },
    });
  } catch (err) {
    next(err);
  }
}
