const express = require("express");
const brandController = require("../controllers/brand.controller");
const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", brandController.getBrands);

router.post("/", verifyToken, requireRoles("admin"), brandController.createBrand);
router.put("/:id", verifyToken, requireRoles("admin"), brandController.updateBrand);
router.delete("/:id", verifyToken, requireRoles("admin"), brandController.deleteBrand);

module.exports = router;