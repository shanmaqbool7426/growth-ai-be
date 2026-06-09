// @ts-nocheck
import express from "express";
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

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "https://growthssmai.vercel.app",
      ...(process.env["FRONTEND_URL"] ? [process.env["FRONTEND_URL"]] : []),
    ],
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, _res, next) => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (err) {
      next(err);
      return;
    }
  }
  next();
});

app.use("/api", healthRouter);

app.use("/api/v1/auth", authLimiter);

app.use("/api/v1", generalLimiter);

app.use("/api/v1", v1Router);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

export default app;
