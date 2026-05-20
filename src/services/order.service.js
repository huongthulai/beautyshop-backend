const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const InventoryLog = require("../models/InventoryLog");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const User = require("../models/User");
const {
  validateVoucher,
  calculateDiscount,
} = require("../services/voucher.service");

const PAYMENT_METHODS = ["cod", "bank_transfer", "momo", "vnpay"];

const getActorId = (actor) => {
  if (!actor) return null;
  return actor.id || actor._id || null;
};

const generateOrderCode = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `ORD${y}${m}${d}${random}`;

  const existed = await Order.findOne({ orderCode });
  if (existed) {
    return generateOrderCode();
  }

  return orderCode;
};

const getMembershipTierBySpent = (totalSpent) => {
  const spent = Number(totalSpent || 0);

  if (spent >= 10000000) return "vvip";
  if (spent >= 5000000) return "vip";
  return "regular";
};

const getOrCreateCustomerFromUser = async (user) => {
  let customer = await Customer.findOne({ email: user.email });

  if (!customer) {
    customer = await Customer.create({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      status: "active",
    });
  }

  return customer;
};

const getProductActivePrice = (product) => {
  return Number(product.finalPrice) || Number(product.originalPrice) || 0;
};

const validateShippingAddress = (shippingAddress) => {
  if (!shippingAddress) {
    throw new Error("Thiếu thông tin địa chỉ giao hàng");
  }

  if (
    !shippingAddress.fullName ||
    !shippingAddress.phone ||
    !shippingAddress.addressLine
  ) {
    throw new Error("Vui lòng nhập đầy đủ fullName, phone, addressLine");
  }
};

const updateUserMembershipAfterDelivered = async (order) => {
  if (!order?.userId) return;

  const user = await User.findById(order.userId);
  if (!user) return;

  user.totalSpent = Number(user.totalSpent || 0) + Number(order.totalAmount || 0);
  user.membershipTier = getMembershipTierBySpent(user.totalSpent);

  await user.save();
};

const buildOrderItemsFromSelectedCart = async (selectedItems) => {
  const productIds = selectedItems.map((item) => item.productId);

  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const inventories = await Inventory.find({ productId: { $in: productIds } });
  const inventoryMap = new Map(
    inventories.map((inv) => [inv.productId.toString(), inv])
  );

  const orderItems = [];
  let subtotal = 0;

  for (const cartItem of selectedItems) {
    const product = productMap.get(cartItem.productId.toString());
    if (!product) {
      throw new Error(`Sản phẩm không tồn tại: ${cartItem.name}`);
    }

    if (product.status !== "active") {
      throw new Error(`Sản phẩm hiện không khả dụng: ${product.name}`);
    }

    const inventory = inventoryMap.get(cartItem.productId.toString());
    if (!inventory) {
      throw new Error(`Chưa có tồn kho cho sản phẩm: ${product.name}`);
    }

    if (inventory.stock < cartItem.qty) {
      throw new Error(
        `Sản phẩm ${product.name} chỉ còn ${inventory.stock} trong kho`
      );
    }

    const unitPrice = getProductActivePrice(product);
    const lineTotal = unitPrice * cartItem.qty;

    orderItems.push({
      productId: product._id,
      sku: product.sku,
      name: product.name,
      image: Array.isArray(product.images) ? product.images[0] || "" : "",
      originalPrice: Number(product.originalPrice) || 0,
      salePercent: Number(product.salePercent) || 0,
      finalPrice: unitPrice,
      price: unitPrice,
      volumeWeight: cartItem.volumeWeight || "",
      color: cartItem.color || "",
      qty: cartItem.qty,
      lineTotal,
    });

    subtotal += lineTotal;
  }

  return { orderItems, subtotal, inventoryMap };
};

const createOrderFromCart = async (userId, payload) => {
  const {
    shippingAddress,
    paymentMethod = "cod",
    shippingFee = 0,
    discountAmount = 0,
    voucherCode, 
    note = "",
  } = payload;

  validateShippingAddress(shippingAddress);

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error("Phương thức thanh toán không hợp lệ");
  }

  if (!userId) {
    throw new Error("Không xác định được người dùng");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  const cart = await Cart.findOne({ userId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error("Giỏ hàng đang trống");
  }

  const selectedItems = cart.items.filter((item) => item.isSelected);
  if (selectedItems.length === 0) {
    throw new Error("Chưa chọn sản phẩm để thanh toán");
  }

  const { orderItems, subtotal, inventoryMap } =
    await buildOrderItemsFromSelectedCart(selectedItems);

  const finalShippingFee = Math.max(Number(shippingFee) || 0, 0);

let finalDiscountAmount = 0;
let appliedVoucher = null;

if (voucherCode?.trim()) {
  const voucher = await validateVoucher({
    code: voucherCode,
    user,
    cart: {
      subtotal,
      items: orderItems,
    },
  });

  finalDiscountAmount = calculateDiscount(voucher, {
    subtotal,
    items: orderItems,
  });

  appliedVoucher = voucher;
  voucher.usedCount = Number(voucher.usedCount || 0) + 1;
  await voucher.save();
}
  const totalAmount = Math.max(
    subtotal + finalShippingFee - finalDiscountAmount,
    0
  );

  const customer = await getOrCreateCustomerFromUser(user);
  const orderCode = await generateOrderCode();

  const order = await Order.create({
    orderCode,
    userId: user._id,
    customerId: customer._id,
    customerSnapshot: {
      name: user.name,
      email: user.email,
      phone: shippingAddress.phone || user.phone || "",
    },
    items: orderItems,
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      addressLine: shippingAddress.addressLine,
      ward: shippingAddress.ward || "",
      district: shippingAddress.district || "",
      province: shippingAddress.province || "",
      note: shippingAddress.note || "",
    },
    subtotal,
shippingFee: finalShippingFee,
discountAmount: finalDiscountAmount,
voucherCode: appliedVoucher?.code || null,
totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "unpaid" : "pending",
    fulfillmentStatus: "pending",
    note: note || "",
    createdBy: user._id,
  });

  for (const item of orderItems) {
    const inventory = inventoryMap.get(item.productId.toString());

    const before = inventory.stock;
    inventory.stock = before - item.qty;
    inventory.reserved = Math.max((inventory.reserved || 0) + item.qty, 0);
    inventory.lastUpdatedBy = user._id;
    await inventory.save();

    await InventoryLog.create({
      productId: item.productId,
      type: "out",
      qty: item.qty,
      before,
      after: inventory.stock,
      note: `Xuất kho do tạo đơn hàng ${order.orderCode}`,
      ref: {
        orderId: order._id,
      },
      createdBy: user._id,
    });

    if (inventory.stock <= 0) {
      await Product.findByIdAndUpdate(item.productId, {
        status: "out_of_stock",
      });
    }
  }

  await Payment.create({
    orderId: order._id,
    method: paymentMethod,
    amount: totalAmount,
    status: paymentMethod === "cod" ? "pending" : "pending",
    transactionId: "",
    paidAt: null,
    note:
      paymentMethod === "cod"
        ? "Thanh toán khi nhận hàng"
        : "Chờ xử lý thanh toán online",
    createdBy: user._id,
  });

  const selectedCartItemIds = new Set(
    selectedItems.map((item) => item._id?.toString()).filter(Boolean)
  );

  cart.items = cart.items.filter(
    (item) => !selectedCartItemIds.has(item._id?.toString())
  );

  if (typeof cart.recalculateTotals === "function") {
    cart.recalculateTotals();
  }

  await cart.save();

  return order;
};

const getMyOrders = async (userId) => {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  return orders;
};

const getOrderById = async (userId, orderId, isAdmin = false) => {
  const filter = { _id: orderId };

  if (!isAdmin) {
    filter.userId = userId;
  }

  const order = await Order.findOne(filter);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  return order;
};

const updateOrderStatus = async (actor, orderId, payload) => {
  const actorId = getActorId(actor);
  const { fulfillmentStatus, paymentStatus, note } = payload;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  const oldFulfillmentStatus = order.fulfillmentStatus;

  if (fulfillmentStatus !== undefined) {
    const allowedFulfillmentStatus = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedFulfillmentStatus.includes(fulfillmentStatus)) {
      throw new Error("fulfillmentStatus không hợp lệ");
    }

    order.fulfillmentStatus = fulfillmentStatus;
  }

  if (paymentStatus !== undefined) {
    const allowedPaymentStatus = [
      "unpaid",
      "pending",
      "paid",
      "refunded",
      "failed",
    ];

    if (!allowedPaymentStatus.includes(paymentStatus)) {
      throw new Error("paymentStatus không hợp lệ");
    }

    order.paymentStatus = paymentStatus;
  }

  if (note !== undefined) {
    order.note = note;
  }

  await order.save();

  if (paymentStatus === "paid") {
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        status: "success",
        paidAt: new Date(),
        note: "Đã xác nhận thanh toán",
        createdBy: actorId,
      },
      { new: true }
    );
  }

  const justDelivered =
    oldFulfillmentStatus !== "delivered" &&
    order.fulfillmentStatus === "delivered";

  if (justDelivered) {
    await updateUserMembershipAfterDelivered(order);
  }

  return order;
};

const cancelOrder = async (actor, orderId, payload = {}, isAdmin = false) => {
  const actorId = getActorId(actor);

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (!isAdmin && order.userId?.toString() !== actorId?.toString()) {
    throw new Error("Bạn không có quyền hủy đơn hàng này");
  }

  if (["shipped", "delivered"].includes(order.fulfillmentStatus)) {
    throw new Error("Không thể hủy đơn khi đơn đã giao vận hoặc đã giao");
  }

  if (order.fulfillmentStatus === "cancelled") {
    throw new Error("Đơn hàng đã được hủy trước đó");
  }

  const cancelNote = payload.note || "Hủy đơn hàng";

  for (const item of order.items) {
    const inventory = await Inventory.findOne({ productId: item.productId });

    if (!inventory) continue;

    const before = inventory.stock;
    inventory.stock = before + item.qty;
    inventory.reserved = Math.max((inventory.reserved || 0) - item.qty, 0);
    inventory.lastUpdatedBy = actorId;
    await inventory.save();

    await InventoryLog.create({
      productId: item.productId,
      type: "in",
      qty: item.qty,
      before,
      after: inventory.stock,
      note: `Hoàn kho do hủy đơn hàng ${order.orderCode}`,
      ref: {
        orderId: order._id,
      },
      createdBy: actorId,
    });

    if (inventory.stock > 0) {
      await Product.findByIdAndUpdate(item.productId, { status: "active" });
    }
  }

  order.fulfillmentStatus = "cancelled";
  order.note = cancelNote;
  await order.save();

  await Payment.findOneAndUpdate(
    { orderId: order._id },
    {
      status: order.paymentStatus === "paid" ? "refunded" : "cancelled",
      note: "Đơn hàng đã bị hủy",
    },
    { new: true }
  );

  return order;
};

module.exports = {
  createOrderFromCart,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};