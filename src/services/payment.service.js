const Payment = require("../models/Payment");
const Order = require("../models/Order");

const ALLOWED_METHODS = ["cod", "bank_transfer", "momo", "vnpay"];
const ALLOWED_CALLBACK_STATUS = ["success", "failed", "refunded"];

const PAYMENT_DESTINATIONS = {
  bank_transfer: {
    accountName: process.env.PAYMENT_ACCOUNT_NAME || "BeautyShop",
    accountNumber: process.env.PAYMENT_BANK_ACCOUNT || "0123456789",
    bankName: process.env.PAYMENT_BANK_NAME || "Ngân hàng ACB",
    branch: process.env.PAYMENT_BANK_BRANCH || "CN TP.HCM",
    note: process.env.PAYMENT_NOTE || "Nội dung: Thanh toán đơn hàng BeautyShop",
    providerLabel: "Chuyển khoản ngân hàng",
  },
  momo: {
    accountName: process.env.PAYMENT_MOMO_NAME || "BeautyShop",
    accountNumber: process.env.PAYMENT_MOMO_NUMBER || "0901234567",
    providerLabel: "MoMo",
    note: process.env.PAYMENT_NOTE || "Nội dung: Thanh toán đơn hàng BeautyShop",
  },
  vnpay: {
    accountName: process.env.PAYMENT_VNPAY_NAME || "BeautyShop",
    accountNumber: process.env.PAYMENT_VNPAY_NUMBER || "0901234567",
    providerLabel: "VNPay",
    note: process.env.PAYMENT_NOTE || "Nội dung: Thanh toán đơn hàng BeautyShop",
  },
};

const getPaymentByOrderId = async (orderId, actor) => {
  if (!orderId) {
    throw new Error("Thiếu orderId");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  const isAdmin = actor?.role && ["admin", "staff"].includes(actor.role);
  const safeUserId = actor?.id || actor?._id;
  if (!isAdmin && order.userId?.toString() !== String(safeUserId)) {
    throw new Error("Bạn không có quyền truy cập thông tin thanh toán của đơn hàng này");
  }

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

  const isAdmin = actor?.role && ["admin", "staff"].includes(actor.role);
  const safeUserId = actor?.id || actor?._id;
  if (!isAdmin && order.userId?.toString() !== String(safeUserId)) {
    throw new Error("Bạn không có quyền thao tác thanh toán cho đơn hàng này");
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

const buildPaymentQrText = (method, amount) => {
  const destination = PAYMENT_DESTINATIONS[method];
  if (!destination) {
    return "";
  }

  const formattedAmount = Number(amount || 0).toLocaleString("vi-VN");

  if (method === "bank_transfer") {
    return `Ngân hàng: ${destination.bankName}\nChi nhánh: ${destination.branch}\nChủ tài khoản: ${destination.accountName}\nSố tài khoản: ${destination.accountNumber}\nSố tiền: ${formattedAmount} đ\n${destination.note}`;
  }

  return `${destination.providerLabel}\nChủ tài khoản: ${destination.accountName}\nSố tài khoản / SĐT: ${destination.accountNumber}\nSố tiền: ${formattedAmount} đ\n${destination.note}`;
};

const getPaymentQrUrl = (method, amount) => {
  const qrPayload = buildPaymentQrText(method, amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    qrPayload
  )}`;
};

const getPaymentInstructions = async (orderId, actor) => {
  if (!orderId) {
    throw new Error("Thiếu orderId");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  const isAdmin = actor?.role && ["admin", "staff"].includes(actor.role);
  const safeUserId = actor?.id || actor?._id;
  if (!isAdmin && order.userId?.toString() !== String(safeUserId)) {
    throw new Error("Bạn không có quyền truy cập thông tin thanh toán của đơn hàng này");
  }

  const method = order.paymentMethod || "cod";
  const amount = order.totalAmount;
  const destination = PAYMENT_DESTINATIONS[method] || null;

  return {
    orderId: order._id,
    paymentMethod: method,
    paymentStatus: order.paymentStatus,
    amount,
    destination,
    qrUrl: destination ? getPaymentQrUrl(method, amount) : null,
    text: destination ? buildPaymentQrText(method, amount) : null,
  };
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
  getPaymentInstructions,
  paymentCallback,
};