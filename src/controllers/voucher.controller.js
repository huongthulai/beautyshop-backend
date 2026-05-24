const {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  calculateDiscount,
} = require("../services/voucher.service");

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
      cart: {
        subtotal,
        items: selectedItems,
      },
    });

    const discount = calculateDiscount(voucher, {
      subtotal,
      items: selectedItems,
    });

    console.log("APPLY VOUCHER DEBUG:", {
      code: voucher.code,
      applyScope: voucher.applyScope,
      subtotal,
      eligibleSubtotal: voucher.$locals?.eligibleSubtotal || 0,
      discount,
    });

    return res.json({
      success: true,
      data: {
        voucher,
        discount,
        eligibleSubtotal: voucher.$locals?.eligibleSubtotal || 0,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể áp dụng voucher",
    });
  }
};

const createVoucherHandler = async (req, res) => {
  try {
    const data = await createVoucher(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo voucher thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không tạo được voucher",
    });
  }
};

const getVouchersHandler = async (req, res) => {
  try {
    const data = await getVouchers(req.query);

    return res.json({
      success: true,
      message: "Lấy danh sách voucher thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được danh sách voucher",
    });
  }
};

const getPublicVouchers = async (req, res) => {
  try {
    const data = await getVouchers({
      ...req.query,
      status: "true",
    });

    return res.json({
      success: true,
      message: "Lấy danh sách voucher khả dụng thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được danh sách voucher",
    });
  }
};

const getVoucherByIdHandler = async (req, res) => {
  try {
    const data = await getVoucherById(req.params.id);

    return res.json({
      success: true,
      message: "Lấy voucher thành công",
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Không tìm thấy voucher",
    });
  }
};

const updateVoucherHandler = async (req, res) => {
  try {
    const data = await updateVoucher(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Cập nhật voucher thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không cập nhật được voucher",
    });
  }
};

const deleteVoucherHandler = async (req, res) => {
  try {
    const data = await deleteVoucher(req.params.id);

    return res.json({
      success: true,
      message: "Xóa voucher thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không xóa được voucher",
    });
  }
};

module.exports = {
  applyVoucher,
  createVoucher: createVoucherHandler,
  getVouchers: getVouchersHandler,
  getVoucherById: getVoucherByIdHandler,
  updateVoucher: updateVoucherHandler,
  deleteVoucher: deleteVoucherHandler,
  getPublicVouchers,
};