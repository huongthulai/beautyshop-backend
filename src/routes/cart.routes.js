const express = require("express");
const cartController = require("../controllers/cart.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", cartController.getMyCart);
router.post("/items", cartController.addItem);
router.patch("/items/:productId", cartController.updateItem);
router.delete("/items/:productId", cartController.removeItem);
router.delete("/", cartController.clearMyCart);

router.patch("/items/:productId/select", cartController.toggleSelectItem);
router.patch("/select-all", cartController.selectAllItems);
router.get("/checkout-preview", cartController.getCheckoutPreview);

module.exports = router;