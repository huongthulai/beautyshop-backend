const express = require("express");
const orderController = require("../controllers/order.controller");
const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

// User
router.post("/", orderController.createOrder);
router.get("/my-orders", orderController.getMyOrders);
router.get("/:id", orderController.getOrderDetail);
router.patch("/:id/cancel", orderController.cancelOrder);

// Admin / Staff
router.patch(
  "/:id/status",
  requireRoles("admin", "staff"),
  orderController.updateOrderStatus
);

module.exports = router;