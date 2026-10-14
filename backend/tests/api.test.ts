import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { seedDatabase } from '../src/utils/seed.js';
import { toCents, fromCents, calculateTax, calculateSubtotal } from '../src/utils/money.js';
import { StoreInventory } from '../src/models/StoreInventory.js';
import { Product } from '../src/models/Product.js';
import { Store } from '../src/models/Store.js';

let app: any;
let adminToken: string;
let cashierToken: string;
let testStoreId: string;
let testProductId: string;

beforeAll(async () => {
  await connectDB();
  await seedDatabase(true);
  app = createApp();

  // Login as Admin
  const adminRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@ricozpos.com', password: 'password123' });
  adminToken = adminRes.body.data.token;

  // Login as Cashier via PIN
  const cashierRes = await request(app)
    .post('/api/v1/auth/pin-login')
    .send({ pin: '1234' });
  cashierToken = cashierRes.body.data.token;
  testStoreId = cashierRes.body.data.user.storeId;
});

afterAll(async () => {
  await disconnectDB();
});

describe('1. Financial Money Utilities', () => {
  it('converts to minor cents accurately without floating-point errors', () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('converts from minor cents accurately', () => {
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(450)).toBe(4.5);
  });

  it('calculates rounded tax correctly', () => {
    // 5% tax on $10.00 is $0.50
    expect(calculateTax(10.0, 5.0)).toBe(0.5);
    // 8.875% tax on $29.99 is $2.66
    expect(calculateTax(29.99, 8.875)).toBe(2.66);
  });

  it('calculates subtotal across items accurately', () => {
    const items = [
      { unitPrice: 4.5, quantity: 2 },
      { unitPrice: 3.75, quantity: 1 },
    ];
    expect(calculateSubtotal(items)).toBe(12.75);
  });
});

describe('2. Authentication & RBAC', () => {
  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('allows authenticated cashier to read products', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    // Cashier must NOT see costPrice
    expect(res.body.data.products[0].costPrice).toBeUndefined();
  });

  it('prohibits cashier from creating products (RBAC 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Unauthorized Product',
        sku: 'UNAUTH-01',
        categoryId: '60c72b2f9b1d8b0015b6d999',
        sellingPrice: 10.0,
      });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows Admin to create a product and rejects duplicate SKU', async () => {
    const product = await Product.findOne();
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Test Product',
        sku: 'TEST-SKU-999',
        categoryId: product?.categoryId.toString(),
        sellingPrice: 19.99,
        costPrice: 8.5,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testProductId = res.body.data._id;

    // Duplicate SKU attempt
    const dupRes = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate SKU Product',
        sku: 'TEST-SKU-999',
        categoryId: product?.categoryId.toString(),
        sellingPrice: 25.0,
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_SKU');
  });
});

describe('3. Inventory & Transactional Checkout', () => {
  it('deducts inventory accurately upon successful checkout', async () => {
    const product = await Product.findOne({ sku: 'COF-001' });
    expect(product).toBeTruthy();

    const invBefore = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    const stockBefore = invBefore?.quantity || 0;

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        storeId: testStoreId,
        paymentMethod: 'CASH',
        cashReceived: 50.0,
        items: [{ productId: product!._id.toString(), quantity: 2 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sale.paymentStatus).toBe('COMPLETED');
    expect(res.body.data.sale.changeDue).toBeGreaterThanOrEqual(0);

    const invAfter = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    expect(invAfter?.quantity).toBe(stockBefore - 2);
  });

  it('rejects sale and prevents negative stock when requesting more items than available', async () => {
    const product = await Product.findOne({ sku: 'BAK-001' }); // Initial stock is 3
    expect(product).toBeTruthy();

    const invBefore = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    const currentStock = invBefore?.quantity || 0;

    const res = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        storeId: testStoreId,
        paymentMethod: 'CASH',
        cashReceived: 500.0,
        items: [{ productId: product!._id.toString(), quantity: currentStock + 50 }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Verify stock did not change
    const invAfter = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    expect(invAfter?.quantity).toBe(currentStock);
  });

  it('enforces idempotency on duplicate sale requests', async () => {
    const product = await Product.findOne({ sku: 'COF-001' });
    const idempotencyKey = 'unique-sale-key-' + Date.now();

    const firstRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        storeId: testStoreId,
        paymentMethod: 'CARD',
        idempotencyKey,
        items: [{ productId: product!._id.toString(), quantity: 1 }],
      });

    expect(firstRes.status).toBe(201);
    const txnNumber = firstRes.body.data.sale.transactionNumber;

    const invAfterFirst = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    const stockAfterFirst = invAfterFirst?.quantity;

    // Replay with identical idempotencyKey
    const replayRes = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        storeId: testStoreId,
        paymentMethod: 'CARD',
        idempotencyKey,
        items: [{ productId: product!._id.toString(), quantity: 1 }],
      });

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.data.idempotentReplay).toBe(true);
    expect(replayRes.body.data.sale.transactionNumber).toBe(txnNumber);

    // Stock must not be deducted a second time
    const invAfterReplay = await StoreInventory.findOne({ storeId: testStoreId, productId: product!._id });
    expect(invAfterReplay?.quantity).toBe(stockAfterFirst);
  });
});
