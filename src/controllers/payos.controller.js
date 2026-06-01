const Order = require("../models/Order");
const Payment = require("../models/Payment");
const {
  verifyPayOSWebhook,
  getPayOSPaymentInfo,
} = require("../services/payos.service");

const markOrderAsPaid = async (paymentOrderCode) => {
  const order = await Order.findOneAndUpdate(
    { paymentOrderCode: Number(paymentOrderCode) },
    {
      paymentStatus: "paid",
      paidAt: new Date(),
    },
    { new: true }
  );

  if (!order) return null;

  await Payment.findOneAndUpdate(
    { orderId: order._id },
    {
      status: "success",
      transactionId: String(paymentOrderCode),
      paidAt: new Date(),
      note: "Đã thanh toán qua VietQR/payOS",
    },
    { new: true }
  );

  return order;
};

const isPayOSPaidStatus = (value) => {
  const status = String(value || "").toUpperCase();
  return status === "PAID" || status === "SUCCESS" || status === "SUCCEEDED";
};

const handlePayOSWebhook = async (req, res) => {
  try {
    console.log("PAYOS WEBHOOK RAW BODY:", JSON.stringify(req.body, null, 2));

    if (!req.body || !Object.keys(req.body).length) {
      return res.status(400).json({
        success: false,
        message: "Webhook thiếu dữ liệu",
      });
    }

    const verifiedData = verifyPayOSWebhook(req.body);

    console.log(
      "PAYOS WEBHOOK VERIFIED DATA:",
      JSON.stringify(verifiedData, null, 2)
    );

    const rawData = req.body?.data || req.body;
    const data = verifiedData?.data || verifiedData || rawData;

    const paymentOrderCode = Number(
      data?.orderCode || rawData?.orderCode || req.body?.orderCode
    );

    const code = req.body?.code || data?.code || rawData?.code;
    const desc = req.body?.desc || data?.desc || rawData?.desc;
    const success = req.body?.success ?? data?.success ?? rawData?.success;
    const status = data?.status || rawData?.status;

    if (!paymentOrderCode) {
      return res.status(400).json({
        success: false,
        message: "Webhook thiếu orderCode",
      });
    }

    const isPaid =
      code === "00" ||
      success === true ||
      desc === "success" ||
      desc === "Thành công" ||
      isPayOSPaidStatus(status);

    if (!isPaid) {
      return res.json({
        success: true,
        message: "Webhook received but payment is not paid",
        data: {
          paymentOrderCode,
          code,
          desc,
          success,
          status,
        },
      });
    }

    const order = await markOrderAsPaid(paymentOrderCode);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn hàng với paymentOrderCode ${paymentOrderCode}`,
      });
    }

    return res.json({
      success: true,
      message: "Webhook processed",
      data: {
        orderId: order._id,
        orderCode: order.orderCode,
        paymentOrderCode: order.paymentOrderCode,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("PayOS webhook error:", error);

    return res.status(400).json({
      success: false,
      message: "Webhook không hợp lệ",
      error: error.message,
    });
  }
};

const syncPayOSPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id || req.user?._id;

    const order = await Order.findOne({
      _id: orderId,
      userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.json({
        success: true,
        message: "Đơn hàng đã thanh toán",
        data: order,
      });
    }

    if (order.paymentMethod !== "vietqr" || !order.paymentOrderCode) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không phải thanh toán VietQR/payOS",
      });
    }

    const paymentInfo = await getPayOSPaymentInfo(order.paymentOrderCode);

    console.log("PAYOS PAYMENT INFO:", JSON.stringify(paymentInfo, null, 2));

    const isPaid =
      isPayOSPaidStatus(paymentInfo?.status) ||
      isPayOSPaidStatus(paymentInfo?.data?.status) ||
      isPayOSPaidStatus(paymentInfo?.paymentStatus) ||
      paymentInfo?.code === "00" ||
      paymentInfo?.data?.code === "00";

    if (isPaid) {
      const paidOrder = await markOrderAsPaid(order.paymentOrderCode);

      return res.json({
        success: true,
        message: "Đã đồng bộ thanh toán thành công",
        data: paidOrder,
        payos: paymentInfo,
      });
    }

    return res.json({
      success: true,
      message: "Đơn hàng chưa thanh toán",
      data: order,
      payos: paymentInfo,
    });
  } catch (error) {
    console.error("Sync payOS payment status error:", error);

    return res.status(400).json({
      success: false,
      message: "Không thể đồng bộ trạng thái thanh toán payOS",
      error: error.message,
    });
  }
};

module.exports = {
  handlePayOSWebhook,
  syncPayOSPaymentStatus,
};
