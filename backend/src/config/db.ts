import mongoose from 'mongoose';
import { config } from './env.js';

let isConnecting = false;

// Consider connected if readyState is 1 (connected) or 2 (connecting, where Mongoose natively buffers operations)
export const isDBConnected = (): boolean =>
  mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2;

// Wait for database connection to be fully ready before dispatching request
export const waitForDB = async (timeoutMs: number = 6000): Promise<boolean> => {
  if (mongoose.connection.readyState === 1) return true;

  if (mongoose.connection.readyState === 0 && !isConnecting) {
    connectDB().catch(() => {});
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((mongoose.connection.readyState as number) === 1) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return (mongoose.connection.readyState as number) === 1 || (mongoose.connection.readyState as number) === 2;
};

// Event listeners for automatic diagnostic logging and recovery
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection state: CONNECTED');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection state: DISCONNECTED. Triggering auto-reconnect...');
  if (!isConnecting) {
    connectDB().catch(() => {});
  }
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection event error:', err.message);
});

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (isConnecting) {
    return;
  }

  isConnecting = true;
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 20,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
  } finally {
    isConnecting = false;
  }
};


