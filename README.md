# RicozPOS — Enterprise Point of Sale Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208.9-green.svg)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-yellow.svg)](https://vitest.dev/)

An enterprise point-of-sale platform designed for physical retail commerce locations to manage in-person counter sales, tender payments, product catalogs, store-level inventory, role-based staff access, and audit trails.

---

## 1. Architecture & Tech Stack

```
Ricoz/
├── backend/                # Node.js + Express REST API (TypeScript)
│   ├── src/
│   │   ├── config/         # MongoDB Mongoose connection with in-memory zero-config dev fallback
│   │   ├── controllers/    # Auth, Products, Inventory, Sales, Reports, Staff, Stores
│   │   ├── middlewares/    # JWT Auth, RBAC Role Matrix, Zod Validation, Central Error Handling
│   │   ├── models/         # User, Store, Category, Product, StoreInventory, InventoryMovement, Sale, SaleItem, AuditLog
│   │   ├── routes/         # Versioned REST endpoints (/api/v1/...)
│   │   └── utils/          # Money precision arithmetic (cents math), Seed script
│   └── tests/              # 11 Comprehensive Vitest unit & integration tests
│
└── frontend/               # Next.js 14 App Router + Tailwind CSS (TypeScript)
    ├── src/
    │   ├── app/            # App routes: /dashboard, /pos, /products, /inventory, /transactions, /staff, /reports, /settings, /login
    │   ├── components/     # AppShell, Responsive Navigation, Modals, Print-friendly Receipts
    │   ├── context/        # AuthContext (JWT, PIN quick-switch, RBAC permissions)
    │   ├── lib/            # Type-safe API client
    │   └── types/          # Shared enterprise retail types & DTOs
    └── package.json
```

### Core Technologies
* **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
* **Backend**: Node.js, Express.js, TypeScript, Zod Schema Validation, Helmet, CORS, Morgan.
* **Database**: MongoDB with Mongoose ODM (Indexes on SKU/Barcode/Transactions, atomic `$inc` stock updates, store-scoped compound keys).
* **Testing**: Vitest + Supertest for backend unit and API integration testing.

---

## 2. Quick Start Prerequisites

* **Node.js**: `v18+` or `v20+` (Tested on `v24.18.0`)
* **NPM**: `v9+` or `v11+`
* **MongoDB**: Supported out-of-the-box! If no `MONGODB_URI` is provided, RicozPOS automatically starts an internal in-memory MongoDB server for zero-friction local development and testing. Alternatively, you can connect to any MongoDB Atlas instance by providing `MONGODB_URI`.

---

## 3. Installation & Startup

### Step 1: Install Dependencies
```bash
# In the project root:
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Configure Environment Files
Both default `.env` files are pre-configured with safe development defaults:

* **Backend (`backend/.env`)**:
  ```env
  PORT=5001
  NODE_ENV=development
  MONGODB_URI=
  JWT_SECRET=super-secret-ricozpos-jwt-key-change-in-production-min-32-chars
  JWT_EXPIRES_IN=8h
  CORS_ORIGIN=http://localhost:3000
  ```

* **Frontend (`frontend/.env.local`)**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
  ```

### Step 3: Run the Application
Open two terminal tabs:

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
```
*API runs at `http://localhost:5001` (automatically seeds sample retail stores, products, inventory, and staff on first run).*

**Terminal 2 (Next.js Frontend):**
```bash
cd frontend
npm run dev
```
*Web application runs at `http://localhost:3000`.*

---

## 4. Default Seed Accounts & Credentials

The seed script creates 3 standard enterprise roles with corresponding email credentials and cashier PINs:

| Role | Email | Password | Cashier PIN | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ricozpos.com` | `password123` | `9999` | Full global access: catalog, staff, stores, inventory, settings, reports. |
| **Store Manager** | `manager@ricozpos.com` | `password123` | `8888` | Store sales, inventory adjustments, product catalog, operational reports. |
| **Cashier** | `cashier@ricozpos.com` | `password123` | `1234` | High-speed POS register, product lookup, checkout, thermal receipt generation. |

*Quick-switch buttons are available on the login page for rapid reviewer demonstration.*

---

## 5. Automated Testing

Run the Vitest test suite:
```bash
cd backend
npm test
```

### Verified Test Suites (11 Passing Tests):
1. **Financial Calculations**: Minor unit integer arithmetic (preventing floating point inaccuracies `0.1 + 0.2`).
2. **Authentication & RBAC**: Unauthenticated 401 rejection, Cashier cost-price redaction, Cashier 403 prohibition on catalog creation, Admin product creation.
3. **Data Integrity & Concurrency**:
   - Atomic inventory deduction during sale checkout.
   - Overselling / insufficient stock rejection with automatic rollback.
   - Idempotent replay preventing duplicate stock deductions on network retries.

---

## 6. API Reference (v1)

### Authentication
* `POST /api/v1/auth/login` — Email & password authentication.
* `POST /api/v1/auth/pin-login` — Terminal PIN switch for cashiers.
* `GET /api/v1/auth/me` — Authenticated profile.

### Product Catalog
* `GET /api/v1/products` — Search and filter products (supports SKU, barcode, category, store stock).
* `POST /api/v1/products` — Create product (Admin / Manager).
* `PATCH /api/v1/products/:id` — Update or soft-deactivate product.

### Store Inventory
* `GET /api/v1/inventory` — Store-level stock counts and low-stock warnings.
* `POST /api/v1/inventory/adjustments` — Auditable stock adjustment (Restock, Damage, Return, Audit).
* `GET /api/v1/inventory/movements` — Complete historical ledger of stock modifications.

### POS Checkout & Transactions
* `POST /api/v1/sales` — Atomic checkout (deducts inventory, saves sale items, records movement, prevents overselling).
* `GET /api/v1/sales` — Filterable transaction history.
* `GET /api/v1/sales/:id` — Complete transaction record and receipt details.

### Reports & Dashboard
* `GET /api/v1/reports/dashboard` — Today's sales, transactions, average ticket, low-stock warnings, 7-day trend.
* `GET /api/v1/reports/sales` — Date-filtered financial aggregates and tender distributions.
* `GET /api/v1/reports/sales?format=csv` — Sanitized CSV export protected against spreadsheet formula injection.

### Staff
* `GET /api/v1/staff` — List staff accounts.
* `POST /api/v1/staff` — Create staff account with role and PIN.
* `PATCH /api/v1/staff/:id` — Update staff (protected against deactivating last Admin).

---

## 7. Production Build Verification

```bash
# Build backend TypeScript
cd backend && npm run build

# Build frontend Next.js production bundle
cd frontend && npm run build
```
