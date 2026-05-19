const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/User");

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const passwordHash = await bcrypt.hash("123456", 10);

    const users = [
      {
        name: "Admin Beautyshop",
        email: "admin@123.com",
        passwordHash,
        phone: "0900000001",
        role: "admin",
        status: "active",
      },
      {
        name: "Staff Beautyshop",
        email: "staff@123.com",
        passwordHash,
        phone: "0900000002",
        role: "staff",
        status: "active",
      },
      {
        name: "Customer Beautyshop",
        email: "cus@123.com",
        passwordHash,
        phone: "0900000003",
        role: "customer",
        status: "active",
      },
    ];

    for (const user of users) {
      const existing = await User.findOne({ email: user.email });
      if (existing) {
        console.log(`User already exists: ${user.email}`);
        continue;
      }

      await User.create(user);
      console.log(`Seeded: ${user.email}`);
    }

    console.log("Seed users completed");
    process.exit(0);
  } catch (error) {
    console.error("Seed users failed:", error.message);
    process.exit(1);
  }
}

seedUsers();