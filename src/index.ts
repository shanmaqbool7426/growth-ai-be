import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env["PORT"]) || 8080;

let dbReady: Promise<void> | null = null;

export async function ensureDB() {
  if (!dbReady) {
    dbReady = connectDB();
  }
  return dbReady;
}

async function bootstrap() {
  await ensureDB();
  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "GrowthHub AI server listening");
  });
}

if (!process.env["VERCEL"]) {
  bootstrap().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}

export default app;
