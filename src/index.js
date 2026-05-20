const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const paymentRoutes = require("./routes/payment.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const adminOrderRoutes = require("./routes/adminOrder.routes");
const userRoutes = require("./routes/user.routes");
const uploadRoutes = require("./routes/upload.routes");
const categoryRoutes = require("./routes/category.routes");
const brandRoutes = require("./routes/brand.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const bannerRoutes = require("./routes/banner.routes");
const voucherRoutes = require("./routes/voucher.routes");
const addressRoutes = require("./routes/address.routes");
const chatbotRoutes = require("./routes/chatbot.routes");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log request (debug)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/chatbot", chatbotRoutes);
// Upload
app.use("/uploads", express.static(path.resolve(__dirname, "../public/uploads")));
app.use("/api/uploads", uploadRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Beautyshop API Running");
});

app.use((err, req, res, next) => {
  console.error("Global error:", err);

  return res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
  });
});

// DB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });