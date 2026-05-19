const express = require("express");
const uploadController = require("../controllers/upload.controller");
const upload = require("../middlewares/upload.middleware");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/auth.middleware");

const router = express.Router();

router.post(
  "/image",
  authMiddleware,
  requireRole("admin", "staff"),
  upload.single("image"),
  uploadController.uploadSingleImage
);

module.exports = router;