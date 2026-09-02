import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Fallback to public DNS servers (Google / Cloudflare) if local ISP DNS blocks SRV records (ECONNREFUSED querySrv)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_err) {
  // Ignore if custom DNS resolution is disallowed in environment
}

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== 'production',
  });
  console.info('MongoDB connected');
}
