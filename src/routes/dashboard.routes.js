const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("admin", "staff"));

router.get("/summary", dashboardController.getDashboardSummary);
router.get("/revenue", dashboardController.getRevenueByDateRange);
router.get("/top-products", dashboardController.getTopProducts);
module.exports = router;