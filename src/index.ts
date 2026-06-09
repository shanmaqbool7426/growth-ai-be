import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env["PORT"]) || 8080;

async function bootstrap() {
  await connectDB();
  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "GrowthHub AI server listening");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
