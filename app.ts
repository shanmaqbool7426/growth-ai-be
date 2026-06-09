import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./src/lib/logger.js";
import v1Router from "./src/routes/v1/index.js";
import healthRouter from "./src/routes/health.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { connectDB } from "./src/config/db.js";

let dbConnected = false;

const app: Express = express();

app.use(helmet() as any);
app.use(
  cors({
    origin: process.env["FRONTEND_URL"] || "*",
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
}) as any;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}) as any;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
  }) as any
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (err) {
      next(err as Error);
      return;
    }
  }
  next();
});

app.use("/api", healthRouter);

app.use("/api/v1/auth", authLimiter);

app.use("/api/v1", generalLimiter);

app.use("/api/v1", v1Router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

export default app;
