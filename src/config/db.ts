import mongoose from "mongoose";
import { logger } from "../lib/logger";

export async function connectDB(): Promise<void> {
  const uri = process.env["MONGO_URI"] || "mongodb+srv://auto-wheel-apps:AutoWheels123@auto-wheels.m4wrf.mongodb.net/growthHub";

  try {
    await mongoose.connect(uri);
    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    throw err;
  }
}
