import { User } from '../models/User.js';
import { Store } from '../models/Store.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { StoreInventory } from '../models/StoreInventory.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Sale } from '../models/Sale.js';
import { SaleItem } from '../models/SaleItem.js';

export async function seedDatabase(force: boolean = false): Promise<void> {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    console.log('[Seed] Database already contains records. Skipping seed.');
    return;
  }

  console.log('[Seed] Seeding development database with initial enterprise retail data...');

  if (force) {
    await Promise.all([
      User.deleteMany({}),
      Store.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      StoreInventory.deleteMany({}),
      InventoryMovement.deleteMany({}),
      Sale.deleteMany({}),
      SaleItem.deleteMany({}),
    ]);
  }

  // 1. Create Default Store
  const flagshipStore = await Store.create({
    name: 'Ricoz Flagship Store',
    code: 'RCZ-01',
    address: '100 Market Street, Suite 400, San Francisco, CA',
    phone: '+1 (555) 019-2834',
    taxRate: 5.0,
    currency: 'USD',
    active: true,
  });

  const secondaryStore = await Store.create({
    name: 'Ricoz Uptown Boutique',
    code: 'RCZ-02',
    address: '422 Lexington Avenue, New York, NY',
    phone: '+1 (555) 018-7291',
    taxRate: 8.875,
    currency: 'USD',
    active: true,
  });

  // 2. Create Users with RBAC
  const adminUser = await User.create({
    name: 'Sarah Connor (Admin)',
    email: 'admin@ricozpos.com',
    password: 'password123',
    pin: '9999',
    role: 'ADMIN',
    active: true,
  });

  const managerUser = await User.create({
    name: 'Marcus Vance (Manager)',
    email: 'manager@ricozpos.com',
    password: 'password123',
    pin: '8888',
    role: 'MANAGER',
    storeId: flagshipStore._id,
    active: true,
  });

  const cashierUser = await User.create({
    name: 'Alex Rivera (Cashier)',
    email: 'cashier@ricozpos.com',
    password: 'password123',
    pin: '1234',
    role: 'CASHIER',
    storeId: flagshipStore._id,
    active: true,
  });

  // 3. Create Categories
  const categories = await Category.create([
    { name: 'Beverages', description: 'Fresh coffees, teas, and cold drinks', slug: 'beverages' },
    { name: 'Bakery & Snacks', description: 'Freshly baked goods and quick bites', slug: 'bakery-snacks' },
    { name: 'Electronics', description: 'Peripherals, cables, and accessories', slug: 'electronics' },
    { name: 'Apparel', description: 'Store branded clothing and merchandise', slug: 'apparel' },
  ]);

  const catMap = new Map(categories.map((c) => [c.slug, c]));

  // 4. Create Products
  const productsData = [
    {
      name: 'Espresso Roast Coffee (12oz)',
      sku: 'COF-001',
      barcode: '89012345001',
      description: 'Single-origin Ethiopian espresso blend',
      categoryId: catMap.get('beverages')!._id,
      categoryName: 'Beverages',
      sellingPrice: 4.5,
      costPrice: 1.5,
      taxRate: 5.0,
      initialStock: 45,
    },
    {
      name: 'Organic Jasmine Green Tea',
      sku: 'TEA-001',
      barcode: '89012345002',
      description: 'Hand-picked organic green tea leaves',
      categoryId: catMap.get('beverages')!._id,
      categoryName: 'Beverages',
      sellingPrice: 3.75,
      costPrice: 1.1,
      taxRate: 5.0,
      initialStock: 30,
    },
    {
      name: 'Fresh Butter Croissant',
      sku: 'BAK-001',
      barcode: '89012345003',
      description: 'Traditional French butter croissant baked daily',
      categoryId: catMap.get('bakery-snacks')!._id,
      categoryName: 'Bakery & Snacks',
      sellingPrice: 3.5,
      costPrice: 1.2,
      taxRate: 5.0,
      initialStock: 3, // Intentional low-stock trigger (threshold is 5)
    },
    {
      name: 'Dark Chocolate Cookie',
      sku: 'BAK-002',
      barcode: '89012345004',
      description: 'Rich Belgian 70% dark chocolate chunk cookie',
      categoryId: catMap.get('bakery-snacks')!._id,
      categoryName: 'Bakery & Snacks',
      sellingPrice: 2.75,
      costPrice: 0.8,
      taxRate: 5.0,
      initialStock: 25,
    },
    {
      name: 'Wireless Bluetooth Mouse',
      sku: 'ELE-001',
      barcode: '89012345005',
      description: 'Ergonomic silent optical wireless mouse',
      categoryId: catMap.get('electronics')!._id,
      categoryName: 'Electronics',
      sellingPrice: 29.99,
      costPrice: 14.0,
      taxRate: 5.0,
      initialStock: 18,
    },
    {
      name: 'USB-C Braided Cable (2m)',
      sku: 'ELE-002',
      barcode: '89012345006',
      description: 'High-speed 100W PD charging cable with nylon braid',
      categoryId: catMap.get('electronics')!._id,
      categoryName: 'Electronics',
      sellingPrice: 14.99,
      costPrice: 4.5,
      taxRate: 5.0,
      initialStock: 4, // Low stock trigger
    },
    {
      name: 'Ricoz Crewneck Sweatshirt',
      sku: 'APP-001',
      barcode: '89012345007',
      description: 'Heavyweight organic cotton sweatshirt',
      categoryId: catMap.get('apparel')!._id,
      categoryName: 'Apparel',
      sellingPrice: 48.0,
      costPrice: 18.0,
      taxRate: 5.0,
      initialStock: 15,
    },
    {
      name: 'Stainless Steel Travel Tumbler (16oz)',
      sku: 'APP-002',
      barcode: '89012345008',
      description: 'Double-walled vacuum insulated tumbler',
      categoryId: catMap.get('apparel')!._id,
      categoryName: 'Apparel',
      sellingPrice: 22.5,
      costPrice: 8.0,
      taxRate: 5.0,
      initialStock: 20,
    },
  ];

  const createdProducts = [];
  for (const item of productsData) {
    const { initialStock, ...pData } = item;
    const prod = await Product.create(pData);
    createdProducts.push({ prod, initialStock });

    // Seed inventory in Flagship Store
    await StoreInventory.create({
      storeId: flagshipStore._id,
      productId: prod._id,
      quantity: initialStock,
      lowStockThreshold: 5,
    });

    // Seed audit movement for initial stock
    await InventoryMovement.create({
      storeId: flagshipStore._id,
      productId: prod._id,
      quantityChange: initialStock,
      previousQuantity: 0,
      newQuantity: initialStock,
      movementType: 'RESTOCK',
      reason: 'Initial warehouse opening stock',
      performedBy: adminUser._id,
      actorName: adminUser.name,
    });

    // Also seed some stock in secondary store
    await StoreInventory.create({
      storeId: secondaryStore._id,
      productId: prod._id,
      quantity: Math.max(5, Math.floor(initialStock / 2)),
      lowStockThreshold: 5,
    });
  }

  // 5. Seed a sample completed transaction so dashboard has real initial records
  const sampleProduct1 = createdProducts[0].prod;
  const sampleProduct2 = createdProducts[3].prod;
  const subtotal = sampleProduct1.sellingPrice * 2 + sampleProduct2.sellingPrice * 1; // 4.5*2 + 2.75 = 11.75
  const tax = Number(((subtotal * 5) / 100).toFixed(2)); // 0.59
  const total = Number((subtotal + tax).toFixed(2)); // 12.34

  const initialSale = await Sale.create({
    transactionNumber: 'TXN-20261015-100001',
    storeId: flagshipStore._id,
    cashierId: cashierUser._id,
    cashierName: cashierUser.name,
    subtotal,
    taxAmount: tax,
    discountAmount: 0,
    totalAmount: total,
    paymentMethod: 'CASH',
    paymentStatus: 'COMPLETED',
    cashReceived: 20.0,
    changeDue: Number((20.0 - total).toFixed(2)),
    customerName: 'Jordan Smith',
    notes: 'Walk-in morning order',
    itemCount: 3,
  });

  await SaleItem.create([
    {
      saleId: initialSale._id,
      productId: sampleProduct1._id,
      productName: sampleProduct1.name,
      sku: sampleProduct1.sku,
      unitPrice: sampleProduct1.sellingPrice,
      quantity: 2,
      subtotal: sampleProduct1.sellingPrice * 2,
      taxRate: 5.0,
      taxAmount: Number(((sampleProduct1.sellingPrice * 2 * 0.05)).toFixed(2)),
      total: Number((sampleProduct1.sellingPrice * 2 * 1.05).toFixed(2)),
    },
    {
      saleId: initialSale._id,
      productId: sampleProduct2._id,
      productName: sampleProduct2.name,
      sku: sampleProduct2.sku,
      unitPrice: sampleProduct2.sellingPrice,
      quantity: 1,
      subtotal: sampleProduct2.sellingPrice,
      taxRate: 5.0,
      taxAmount: Number(((sampleProduct2.sellingPrice * 0.05)).toFixed(2)),
      total: Number((sampleProduct2.sellingPrice * 1.05).toFixed(2)),
    },
  ]);

  console.log('[Seed] Seeding completed successfully!');
  console.log('[Seed] Default credentials:');
  console.log('       ADMIN:   admin@ricozpos.com   / password123 (PIN: 9999)');
  console.log('       MANAGER: manager@ricozpos.com / password123 (PIN: 8888)');
  console.log('       CASHIER: cashier@ricozpos.com / password123 (PIN: 1234)');
}

// Direct execution helper
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  import('../config/db.js').then(async ({ connectDB, disconnectDB }) => {
    await connectDB();
    await seedDatabase(true);
    await disconnectDB();
    process.exit(0);
  });
}
