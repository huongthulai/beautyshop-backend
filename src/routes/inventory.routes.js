const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("admin", "staff"));

router.get("/", inventoryController.getInventories);
router.get("/logs", inventoryController.getInventoryLogs);
router.get("/:productId", inventoryController.getInventoryByProductId);
router.post("/import", inventoryController.importStock);
router.patch("/adjust", inventoryController.adjustStock);

module.exports = router;