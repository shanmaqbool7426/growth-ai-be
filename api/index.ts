import type { Request, Response } from "express";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let connected = false;

export default async function handler(req: Request, res: Response) {
  if (!connected) {
    try {
      await connectDB();
      connected = true;
    } catch {
      res.status(500).json({ success: false, message: "Database connection failed" });
      return;
    }
  }
  app(req, res);
}
