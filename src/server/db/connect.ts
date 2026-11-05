import "server-only";
import mongoose from "mongoose";
import { env } from "../config/env";

/**
 * Serverless-safe connection cache. On Vercel each warm function instance reuses the
 * same connection via globalThis instead of opening a new pool per request, which keeps
 * us well under the Atlas M0 connection limit.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(env().MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8_000,
      bufferCommands: false,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // allow retry on next request
    throw err;
  }
  return cache.conn;
}
