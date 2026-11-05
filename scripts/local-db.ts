/**
 * Local development MongoDB without installing MongoDB or Docker.
 * Starts a real mongod (downloaded by mongodb-memory-server) on port 27017,
 * persisting to ./.data/mongo. Set MONGODB_URI=mongodb://127.0.0.1:27017/authordesk
 * Usage: npm run db:local   (Ctrl+C to stop)
 */
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const dbPath = ".data/mongo";
  mkdirSync(dbPath, { recursive: true });
  const server = await MongoMemoryServer.create({
    instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
  });
  console.log(`Local MongoDB running at ${server.getUri()} (data in ${dbPath})`);
  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
