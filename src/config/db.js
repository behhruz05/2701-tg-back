import mongoose from 'mongoose';
import { env } from './env.js';

// MongoDB ga ulanish. Ulanmasa server ishlamasligi kerak.
export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(env.mongoUri);
    console.log(`✅ MongoDB ulandi: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB ulanmadi:', error.message);
    process.exit(1);
  }
}
