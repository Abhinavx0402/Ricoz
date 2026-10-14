import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function connectDB(): Promise<string> {
  const uri = process.env.MONGODB_URI?.trim();

  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log(`[Database] Connected to external MongoDB at ${uri.split('@').pop()?.split('/')[0] || 'configured host'}`);
      return uri;
    } catch (err) {
      console.warn('[Database] Failed to connect to MONGODB_URI. Falling back to in-memory MongoDB...', err);
    }
  }

  // Fallback to in-memory MongoDB for local zero-config development & testing
  if (!mongod) {
    mongod = await MongoMemoryServer.create();
  }
  const memUri = mongod.getUri();
  await mongoose.connect(memUri);
  console.log(`[Database] Connected to local in-memory MongoDB (${memUri})`);
  return memUri;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
  console.log('[Database] Disconnected from MongoDB');
}
