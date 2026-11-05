import { readFileSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resetEnvCache } from "@/server/config/env";
import { connectDB } from "@/server/db/connect";
import { seedDatabase, type SampleData } from "@/server/db/seed";

let server: MongoMemoryServer | null = null;

/** Start an in-memory MongoDB, point the app at it, and seed the real sample dataset. */
export async function startTestDb(opts: { withDemoTickets?: boolean } = {}) {
  server = await MongoMemoryServer.create();
  process.env.MONGODB_URI = server.getUri("authordesk-test");
  resetEnvCache();
  (globalThis as unknown as { __mongoose?: unknown }).__mongoose = undefined;
  await connectDB();
  const data = JSON.parse(readFileSync(join(process.cwd(), "data/sample-data.json"), "utf8")) as SampleData;
  return seedDatabase(data, opts);
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await server?.stop();
  server = null;
}
