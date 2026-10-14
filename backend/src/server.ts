import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';

const PORT = parseInt(process.env.PORT || '5001', 10);

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty or AUTO_SEED is enabled
    if (process.env.NODE_ENV !== 'production' || process.env.AUTO_SEED === 'true') {
      await seedDatabase(false);
    }

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`[RicozPOS] Server running on http://localhost:${PORT}`);
      console.log(`[RicozPOS] API Endpoint: http://localhost:${PORT}/api/v1`);
      console.log(`[RicozPOS] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[RicozPOS] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
