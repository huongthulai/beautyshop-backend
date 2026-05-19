const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

// Public callback từ cổng thanh toán
router.post("/callback", paymentController.paymentCallback);

// User/Admin authenticated routes
router.post("/", verifyToken, paymentController.createPayment);
router.get("/order/:orderId", verifyToken, paymentController.getPaymentsByOrderId);

module.exports = router;