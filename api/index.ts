import type { Request, Response } from "express";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let connected = false;

export default async function handler(req: Request, res: Response) {
  if (!connected) {
    await connectDB();
    connected = true;
  }
  app(req, res);
}
