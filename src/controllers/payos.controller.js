const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { verifyPayOSWebhook } = require("../services/payos.service");

const handlePayOSWebhook = async (req, res) => {
  try {
    console.log("PAYOS WEBHOOK RAW BODY:", JSON.stringify(req.body, null, 2));

    const webhookData = verifyPayOSWebhook(req.body);

    console.log(
      "PAYOS WEBHOOK VERIFIED DATA:",
      JSON.stringify(webhookData, null, 2)
    );

    const data = webhookData?.data || webhookData;

    const orderCode = Number(data?.orderCode);
    const code = data?.code;
    const desc = data?.desc;

    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Webhook thiếu orderCode",
      });
    }

    const isPaid =
      code === "00" ||
      desc === "success" ||
      data?.status === "PAID" ||
      data?.success === true;

    if (!isPaid) {
      return res.json({
        success: true,
        message: "Webhook received but payment is not paid",
        data: {
          orderCode,
          code,
          desc,
        },
      });
    }

    const order = await Order.findOneAndUpdate(
      { paymentOrderCode: orderCode },
      {
        paymentStatus: "paid",
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn hàng với paymentOrderCode ${orderCode}`,
      });
    }

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        status: "success",
        transactionId: String(orderCode),
        paidAt: new Date(),
        note: "Đã thanh toán qua VietQR/payOS",
      },
      { new: true }
    );

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

module.exports = {
  handlePayOSWebhook,
};