const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { verifyPayOSWebhook } = require("../services/payos.service");

const handlePayOSWebhook = async (req, res) => {
  try {
    const data = verifyPayOSWebhook(req.body);
    const orderCode = data?.orderCode || data?.data?.orderCode;
    const isSuccess =
      data?.code === "00" ||
      data?.success === true ||
      data?.data?.code === "00";

    if (isSuccess && orderCode) {
      const order = await Order.findOneAndUpdate(
        { paymentOrderCode: Number(orderCode) },
        {
          paymentStatus: "paid",
          paidAt: new Date(),
        },
        { new: true }
      );

      if (order) {
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
      }
    }

    return res.json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    console.error("PayOS webhook error:", error);

    return res.status(400).json({
      success: false,
      message: "Webhook không hợp lệ",
    });
  }
};

module.exports = {
  handlePayOSWebhook,
};
