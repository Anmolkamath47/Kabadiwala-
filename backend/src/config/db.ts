import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';
import { config } from './index.js';

let mongod: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    const isTest = process.env.NODE_ENV === 'test';
    const dbDir = path.resolve(process.cwd(), '.db_data');

    if (!isTest && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Proactively clear stale lock files from previous unclean shutdowns
    if (!isTest && fs.existsSync(dbDir)) {
      const lockFiles = ['mongod.lock', 'WiredTiger.lock'];
      for (const file of lockFiles) {
        const lockPath = path.join(dbDir, file);
        if (fs.existsSync(lockPath)) {
          try {
            fs.unlinkSync(lockPath);
            console.log(`🧹 Cleared stale lock file: ${file}`);
          } catch {
            // Ignored if file is actively held
          }
        }
      }
    }

    if (config.useMemoryDb || isTest) {
      if (isTest) {
        console.log('⚡ Initializing isolated in-memory test MongoDB instance...');
        mongod = await MongoMemoryServer.create();
      } else {
        console.log(`⚡ Initializing persistent database engine at ${dbDir}...`);
        try {
          mongod = await Promise.race([
            MongoMemoryServer.create({
              instance: {
                dbPath: dbDir,
                storageEngine: 'wiredTiger',
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Persistent DB startup timeout')), 5000)
            ),
          ]);
        } catch (memErr) {
          console.warn('⚠️ Could not acquire persistent lock on .db_data, falling back to clean in-memory instance:', memErr);
          mongod = await MongoMemoryServer.create();
        }
      }
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected (${isTest ? 'Test Memory Server' : 'Persistent Storage Engine'}): ${uri}`);
      return;
    }

    try {
      console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('✅ Connected to MongoDB server');
    } catch (err) {
      console.warn('⚠️ Local MongoDB connection failed. Falling back to persistent database engine...');
      try {
        mongod = await Promise.race([
          MongoMemoryServer.create({
            instance: {
              dbPath: dbDir,
              storageEngine: 'wiredTiger',
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Persistent DB fallback timeout')), 5000)
          ),
        ]);
      } catch {
        mongod = await MongoMemoryServer.create();
      }
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected (Persistent Storage Fallback): ${uri}`);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
  } catch (err) {
    console.error('Error during DB disconnect:', err);
  }
};

// Graceful cleanup on server shutdown
process.once('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});
