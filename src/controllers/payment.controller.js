const paymentService = require("../services/payment.service");

const getPaymentsByOrderId = async (req, res) => {
  try {
    const payments = await paymentService.getPaymentByOrderId(req.params.orderId);

    return res.json({
      message: "Lấy danh sách thanh toán thành công",
      data: payments,
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
};

const createPayment = async (req, res) => {
  try {
    const payment = await paymentService.createPaymentForOrder(req.user, req.body);

    return res.status(201).json({
      message: "Khởi tạo thanh toán thành công",
      data: payment,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const paymentCallback = async (req, res) => {
  try {
    const result = await paymentService.paymentCallback(req.body);

    return res.json({
      message: "Xử lý callback thanh toán thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  getPaymentsByOrderId,
  createPayment,
  paymentCallback,
};