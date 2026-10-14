import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';

const PORT = parseInt(process.env.PORT || '5001', 10);

async function startServer() {
  try {
    await connectDB();

    // Auto-seed in development if database is empty
    if (process.env.NODE_ENV !== 'production') {
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
