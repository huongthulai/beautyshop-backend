const express = require("express");
const userController = require("../controllers/user.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  updateProfileSchema,
  changePasswordSchema,
} = require("../validators/user.validator");

const router = express.Router();

// middleware check admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập",
    });
  }
  next();
};

router.use(authMiddleware);

router.get("/me", userController.getMyProfile);

router.patch(
  "/me",
  validate(updateProfileSchema),
  userController.updateMyProfile
);

router.patch(
  "/change-password",
  validate(changePasswordSchema),
  userController.changeMyPassword
);

// ===== ADMIN USERS =====
router.get("/", requireAdmin, userController.getUsers);
router.post("/", requireAdmin, userController.createUser);
router.patch("/:id", requireAdmin, userController.updateUser);
router.delete("/:id", requireAdmin, userController.deleteUser);

module.exports = router;