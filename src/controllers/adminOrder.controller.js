const adminOrderService = require("../services/adminOrder.service");

const getAllOrders = async (req, res) => {
  try {
    const result = await adminOrderService.getAllOrders(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy danh sách đơn hàng thất bại",
    });
  }
};

module.exports = {
  getAllOrders,
};