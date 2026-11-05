/**
 * Seeds MongoDB with the provided dataset + demo admins + demo tickets.
 * Usage: npm run seed   (reads MONGODB_URI from .env.local)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { demoAdmins, demoPasswords, seedDatabase, type SampleData } from "@/server/db/seed";

async function main() {
  const data = JSON.parse(readFileSync(join(process.cwd(), "data/sample-data.json"), "utf8")) as SampleData;
  await connectDB();
  const result = await seedDatabase(data);
  console.log("Seed complete:", result);
  console.log(`Authors log in with their dataset email + password "${demoPasswords.author}"`);
  console.log(`Admins: ${demoAdmins.map((a) => a.email).join(", ")} / "${demoPasswords.admin}"`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
