const Payment = require("../models/Payment");
const Order = require("../models/Order");

const ALLOWED_METHODS = ["cod", "bank_transfer", "momo", "vnpay"];
const ALLOWED_CALLBACK_STATUS = ["success", "failed", "refunded"];

const getPaymentByOrderId = async (orderId) => {
  const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });

  if (!payments || payments.length === 0) {
    throw new Error("Không tìm thấy thanh toán cho đơn hàng");
  }

  return payments;
};

const createPaymentForOrder = async (actor, payload) => {
  const { orderId, method } = payload;

  if (!orderId || !method) {
    throw new Error("Thiếu orderId hoặc method");
  }

  if (!ALLOWED_METHODS.includes(method)) {
    throw new Error("Phương thức thanh toán không hợp lệ");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.paymentStatus === "paid") {
    throw new Error("Đơn hàng đã được thanh toán");
  }

  const payment = await Payment.create({
    orderId: order._id,
    method,
    amount: order.totalAmount,
    status: "pending",
    transactionId: "",
    paidAt: null,
    note: "Khởi tạo thanh toán mới",
    createdBy: actor?.id || null,
  });

  if (order.paymentMethod !== method || order.paymentStatus !== "pending") {
    order.paymentMethod = method;
    order.paymentStatus = "pending";
    await order.save();
  }

  return payment;
};

const paymentCallback = async (payload) => {
  const {
    orderId,
    transactionId,
    status,
    method,
    amount,
    note = "",
  } = payload;

  if (!orderId) {
    throw new Error("Thiếu orderId");
  }

  if (!transactionId) {
    throw new Error("Thiếu transactionId");
  }

  if (!ALLOWED_CALLBACK_STATUS.includes(status)) {
    throw new Error("status callback không hợp lệ");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  let payment = await Payment.findOne({
    orderId,
    transactionId,
  }).sort({ createdAt: -1 });

  if (!payment) {
    payment = await Payment.findOne({ orderId }).sort({ createdAt: -1 });

    if (!payment) {
      payment = await Payment.create({
        orderId,
        method: method || order.paymentMethod || "bank_transfer",
        amount: Number(amount) || order.totalAmount,
        status: "pending",
        transactionId,
        paidAt: null,
        note: "Tạo thanh toán từ callback",
        createdBy: null,
      });
    }
  }

  if (method && ALLOWED_METHODS.includes(method)) {
    payment.method = method;
    order.paymentMethod = method;
  }

  if (amount !== undefined && amount !== null && !Number.isNaN(Number(amount))) {
    payment.amount = Number(amount);
  }

  payment.transactionId = transactionId;

  if (status === "success") {
    payment.status = "success";
    payment.paidAt = new Date();
    payment.note = note || "Thanh toán thành công";

    order.paymentStatus = "paid";
  }

  if (status === "failed") {
    payment.status = "failed";
    payment.note = note || "Thanh toán thất bại";

    order.paymentStatus = "failed";
  }

  if (status === "refunded") {
    payment.status = "refunded";
    payment.note = note || "Hoàn tiền";

    order.paymentStatus = "refunded";
  }

  await payment.save();
  await order.save();

  return {
    payment,
    order,
  };
};

module.exports = {
  getPaymentByOrderId,
  createPaymentForOrder,
  paymentCallback,
};