const express = require("express");
const router = express.Router();

const { applyVoucher } = require("../controllers/voucher.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

router.post("/apply", authMiddleware, applyVoucher);

module.exports = router;