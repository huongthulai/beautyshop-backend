const dashboardService = require("../services/dashboard.service");

const getDashboardSummary = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardSummary();

    return res.status(200).json({
      success: true,
      message: "Lấy dashboard thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy dashboard thất bại",
    });
  }
};

const getRevenueByDateRange = async (req, res) => {
  try {
    const data = await dashboardService.getRevenueByDateRange(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy thống kê doanh thu thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy thống kê doanh thu thất bại",
    });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const data = await dashboardService.getTopProducts(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy sản phẩm bán chạy thành công",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy sản phẩm bán chạy thất bại",
    });
  }
};

module.exports = {
  getDashboardSummary,
  getRevenueByDateRange,
  getTopProducts,
};