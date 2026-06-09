import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Service } from "../models/Service.js";
import { Order } from "../models/Order.js";
import { Transaction } from "../models/Transaction.js";
import { generateReferralCode, generateTransactionRef, generateOrderRef } from "../utils/generateCode.js";

// Bypass pre-save hook by using insertMany with pre-hashed passwords

const MONGO_URI = process.env["MONGO_URI"] || "";
if (!MONGO_URI) throw new Error("MONGO_URI required");

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Service.deleteMany({}),
    Order.deleteMany({}),
    Transaction.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  const [adminHash, userHash, agencyHash] = await Promise.all([
    bcrypt.hash("Admin@123456", 12),
    bcrypt.hash("User@123456", 12),
    bcrypt.hash("Agency@123456", 12),
  ]);

  const adminId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const agencyId = new mongoose.Types.ObjectId();

  const [admin, user, agency] = await User.insertMany([
    { _id: adminId, name: "Admin User", username: "admin", email: "admin@growthhub.ai", password: adminHash, role: "admin", balance: 1000, referralCode: "ADMIN0001", status: "active", isEmailVerified: true },
    { _id: userId, name: "Demo User", username: "demouser", email: "user@growthhub.ai", password: userHash, role: "user", balance: 50, referralCode: generateReferralCode("demouser"), status: "active", isEmailVerified: true },
    { _id: agencyId, name: "Agency Pro", username: "agencypro", email: "agency@growthhub.ai", password: agencyHash, role: "agency", balance: 500, referralCode: generateReferralCode("agencypro"), referredBy: adminId, status: "active", isEmailVerified: true },
  ]);

  console.log("Users created:", { admin: admin.email, user: user.email, agency: agency.email });

  // Sample services
  const servicesData = [
    { name: "Instagram Followers — High Quality", platform: "Instagram", category: "Followers", pricePerThousand: 2.5, minQuantity: 100, maxQuantity: 100000, avgDeliveryTime: "0-24 hours", refillSupport: true, qualityLabel: "High Quality" },
    { name: "Instagram Likes — Real", platform: "Instagram", category: "Likes", pricePerThousand: 1.2, minQuantity: 50, maxQuantity: 50000, avgDeliveryTime: "0-2 hours", refillSupport: false, qualityLabel: "Real" },
    { name: "Instagram Views — Fast", platform: "Instagram", category: "Views", pricePerThousand: 0.5, minQuantity: 1000, maxQuantity: 1000000, avgDeliveryTime: "Instant", refillSupport: false, qualityLabel: "Fast" },
    { name: "YouTube Views — Retention", platform: "YouTube", category: "Views", pricePerThousand: 3.0, minQuantity: 500, maxQuantity: 500000, avgDeliveryTime: "1-3 days", refillSupport: false, qualityLabel: "High Retention" },
    { name: "YouTube Subscribers — Real", platform: "YouTube", category: "Subscribers", pricePerThousand: 8.0, minQuantity: 100, maxQuantity: 10000, avgDeliveryTime: "1-7 days", refillSupport: true, qualityLabel: "Real" },
    { name: "TikTok Followers", platform: "TikTok", category: "Followers", pricePerThousand: 1.8, minQuantity: 100, maxQuantity: 100000, avgDeliveryTime: "0-12 hours", refillSupport: false, qualityLabel: "Standard" },
    { name: "TikTok Likes — Fast", platform: "TikTok", category: "Likes", pricePerThousand: 0.8, minQuantity: 100, maxQuantity: 100000, avgDeliveryTime: "Instant", refillSupport: false, qualityLabel: "Fast" },
    { name: "Twitter/X Followers", platform: "Twitter", category: "Followers", pricePerThousand: 3.5, minQuantity: 100, maxQuantity: 50000, avgDeliveryTime: "0-24 hours", refillSupport: true, qualityLabel: "Standard" },
    { name: "Facebook Page Likes", platform: "Facebook", category: "Likes", pricePerThousand: 2.0, minQuantity: 100, maxQuantity: 50000, avgDeliveryTime: "1-3 days", refillSupport: false, qualityLabel: "Standard" },
    { name: "LinkedIn Connections", platform: "LinkedIn", category: "Connections", pricePerThousand: 12.0, minQuantity: 50, maxQuantity: 5000, avgDeliveryTime: "3-7 days", refillSupport: false, qualityLabel: "Premium" },
  ];

  const services = await Service.insertMany(servicesData);
  console.log(`Created ${services.length} services`);

  // Sample order for demo user
  const svc = services[0]!;
  const amount = parseFloat(((500 / 1000) * svc.pricePerThousand).toFixed(4));
  const order = await Order.create({
    user: user._id,
    service: svc._id,
    serviceSnapshot: { name: svc.name, platform: svc.platform, category: svc.category, pricePerThousand: svc.pricePerThousand },
    link: "https://instagram.com/demo_account",
    quantity: 500,
    amount,
    status: "completed",
    refOrderId: generateOrderRef(),
    startCount: 1200,
    remains: 0,
    completedAt: new Date(),
  });

  await Transaction.create({
    user: user._id,
    type: "deposit",
    amount: 100,
    balanceBefore: 0,
    balanceAfter: 100,
    refId: generateTransactionRef(),
    description: "Initial demo deposit",
    status: "completed",
  });

  await Transaction.create({
    user: user._id,
    type: "order_payment",
    amount: -amount,
    balanceBefore: 100,
    balanceAfter: 100 - amount,
    refId: generateTransactionRef(),
    description: `Order payment for ${svc.name}`,
    relatedOrder: order._id as mongoose.Types.ObjectId,
    status: "completed",
  });

  console.log("Sample orders and transactions created");
  console.log("\n=== SEED COMPLETE ===");
  console.log("Admin login:  admin@growthhub.ai / Admin@123456");
  console.log("User login:   user@growthhub.ai / User@123456");
  console.log("Agency login: agency@growthhub.ai / Agency@123456");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
