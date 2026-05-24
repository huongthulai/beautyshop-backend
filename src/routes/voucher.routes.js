const express = require("express");
const router = express.Router();

const {
  applyVoucher,
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  getPublicVouchers,
} = require("../controllers/voucher.controller");

const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");

router.post("/apply", verifyToken, applyVoucher);

router.get("/public", verifyToken, getPublicVouchers);

router.get("/", verifyToken, requireRoles("admin", "staff"), getVouchers);

router.post("/", verifyToken, requireRoles("admin", "staff"), createVoucher);

router.get("/:id", verifyToken, requireRoles("admin", "staff"), getVoucherById);

router.put("/:id", verifyToken, requireRoles("admin", "staff"), updateVoucher);

router.delete("/:id", verifyToken, requireRoles("admin", "staff"), deleteVoucher);

module.exports = router;