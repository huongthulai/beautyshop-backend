const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  handlePayOSWebhook,
  syncPayOSPaymentStatus,
} = require("../controllers/payos.controller");

const router = express.Router();

// Public webhook/callback từ cổng thanh toán.
router.post("/payos-webhook", handlePayOSWebhook);
router.post("/callback", paymentController.paymentCallback);

// User/Admin authenticated routes
router.post("/", verifyToken, paymentController.createPayment);
router.get("/order/:orderId", verifyToken, paymentController.getPaymentsByOrderId);
router.get(
  "/order/:orderId/instructions",
  verifyToken,
  paymentController.getPaymentInstructions
);

// Frontend popup gọi route này để đồng bộ trạng thái từ payOS.
// Nếu payOS đã PAID, backend sẽ cập nhật order.paymentStatus = "paid".
router.get("/payos/:orderId/sync", verifyToken, syncPayOSPaymentStatus);

module.exports = router;
