const { PayOS } = require("@payos/node");

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const createPayOSPayment = async ({ order }) => {
  if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    throw new Error("Thiếu cấu hình payOS. Vui lòng kiểm tra PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env");
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
  const paymentOrderCode = Number(String(Date.now()).slice(-10));

  const paymentData = {
    orderCode: paymentOrderCode,
    amount: Number(order.totalAmount || 0),
    description: `DH${String(order.orderCode || order._id).slice(-8)}`,
    items: order.items.map((item) => ({
      name: String(item.name || "San pham").slice(0, 25),
      quantity: Number(item.qty || 1),
      price: Number(item.finalPrice || item.price || 0),
    })),
    returnUrl: `${frontendUrl}/payment/success?orderId=${order._id}`,
    cancelUrl: `${frontendUrl}/payment/cancel?orderId=${order._id}`,
  };

  const paymentLink = await payOS.paymentRequests.create(paymentData);

  return {
    paymentOrderCode,
    checkoutUrl: paymentLink.checkoutUrl,
    qrCode: paymentLink.qrCode,
    paymentLinkId: paymentLink.paymentLinkId,
  };
};

const verifyPayOSWebhook = (body) => {
  return payOS.webhooks.verify(body);
};

module.exports = {
  createPayOSPayment,
  verifyPayOSWebhook,
};
