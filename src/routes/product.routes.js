const express = require("express");
const productController = require("../controllers/product.controller");
const productImportController = require("../controllers/productImport.controller");
const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");
const csvUpload = require("../middlewares/csvUpload.middleware");

const router = express.Router();

// Public routes
router.get("/", productController.getProducts);
router.get("/suggestions", productController.getProductSuggestions);
router.get("/detail/:identifier", productController.getProductDetail);

// Admin / Staff routes
router.post(
  "/import/csv",
  verifyToken,
  requireRoles("admin", "staff"),
  csvUpload.single("file"),
  productImportController.importProductsByCsv
);

router.post(
  "/",
  verifyToken,
  requireRoles("admin", "staff"),
  productController.createProduct
);

router.patch(
  "/:id",
  verifyToken,
  requireRoles("admin", "staff"),
  productController.updateProduct
);

router.delete(
  "/:id",
  verifyToken,
  requireRoles("admin"),
  productController.deleteProduct
);

module.exports = router;