const express = require("express");
const categoryController = require("../controllers/category.controller");
const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", categoryController.getCategories);

router.post("/", verifyToken, requireRoles("admin"), categoryController.createCategory);
router.put("/:id", verifyToken, requireRoles("admin"), categoryController.updateCategory);
router.delete("/:id", verifyToken, requireRoles("admin"), categoryController.deleteCategory);

module.exports = router;