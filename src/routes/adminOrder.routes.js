const express = require("express");
const adminOrderController = require("../controllers/adminOrder.controller");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("admin", "staff"));

router.get("/", adminOrderController.getAllOrders);

module.exports = router;