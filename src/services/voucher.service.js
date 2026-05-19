const Voucher = require("../models/Voucher");

const validateVoucher = async ({ code, user, cart }) => {
  if (!code?.trim()) {
    throw new Error("Vui lòng nhập mã voucher");
  }

  const voucher = await Voucher.findOne({
    code: code.trim().toUpperCase(),
  });

  if (!voucher) {
    throw new Error("Voucher không tồn tại");
  }

  if (!voucher.isActive) {
    throw new Error("Voucher đã bị tắt");
  }

  const now = new Date();

  if (voucher.startDate && now < voucher.startDate) {
    throw new Error("Voucher chưa bắt đầu");
  }

  if (voucher.endDate && now > voucher.endDate) {
    throw new Error("Voucher đã hết hạn");
  }

  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    throw new Error("Voucher đã hết lượt sử dụng");
  }

  if (
    user?.membershipTier &&
    Array.isArray(voucher.applicableTiers) &&
    voucher.applicableTiers.length > 0 &&
    !voucher.applicableTiers.includes(user.membershipTier)
  ) {
    throw new Error("Voucher không áp dụng cho tài khoản của bạn");
  }

  if (Number(cart?.subtotal || 0) < Number(voucher.minOrderValue || 0)) {
    throw new Error(
      `Đơn hàng chưa đạt giá trị tối thiểu ${Number(
        voucher.minOrderValue || 0
      ).toLocaleString("vi-VN")} đ`
    );
  }

  return voucher;
};

const calculateDiscount = (voucher, cart) => {
  const subtotal = Number(cart?.subtotal || 0);
  let discount = 0;

  if (voucher.discountType === "fixed") {
    discount = Number(voucher.discountValue || 0);
  } else if (voucher.discountType === "percent") {
    discount = (subtotal * Number(voucher.discountValue || 0)) / 100;

    if (voucher.maxDiscount !== null && voucher.maxDiscount !== undefined) {
      discount = Math.min(discount, Number(voucher.maxDiscount || 0));
    }
  }

  discount = Math.floor(discount);

  if (discount > subtotal) {
    discount = subtotal;
  }

  return Math.max(discount, 0);
};

module.exports = {
  validateVoucher,
  calculateDiscount,
};