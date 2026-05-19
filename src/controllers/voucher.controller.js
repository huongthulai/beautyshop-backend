const { validateVoucher, calculateDiscount } = require("../services/voucher.service");
const Cart = require("../models/Cart");

const applyVoucher = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng đang trống",
      });
    }

    const selectedItems = cart.items.filter((item) => item.isSelected);
    if (!selectedItems.length) {
      return res.status(400).json({
        success: false,
        message: "Chưa chọn sản phẩm để thanh toán",
      });
    }

    const subtotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.lineTotal || 0),
      0
    );

    const voucher = await validateVoucher({
      code,
      user: req.user,
      cart: { subtotal },
    });

    const discount = calculateDiscount(voucher, { subtotal });

    return res.json({
      success: true,
      data: {
        voucher,
        discount,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  applyVoucher,
};