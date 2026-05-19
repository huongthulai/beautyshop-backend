const express = require("express");
const bannerController = require("../controllers/banner.controller");
const {
  authMiddleware,
  requireRole,
} = require("../middlewares/auth.middleware");

const router = express.Router();

// public
router.get("/active", bannerController.getActiveBanners);

// admin / staff
router.use(authMiddleware);
router.use(requireRole("admin", "staff"));

router.get("/", bannerController.getBanners);
router.post("/", bannerController.createBanner);
router.patch("/:id", bannerController.updateBanner);
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;