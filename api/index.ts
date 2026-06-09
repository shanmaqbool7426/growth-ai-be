import app from "../app.js";
import { connectDB } from "../src/config/db.js";

let connected = false;

export default async function handler(req: any, res: any) {
  if (!connected) {
    try {
      await connectDB();
      connected = true;
    } catch {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Internal server error" }));
      return;
    }
  }
  app(req, res);
}
