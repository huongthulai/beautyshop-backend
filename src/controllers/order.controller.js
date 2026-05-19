const orderService = require("../services/order.service");
const {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} = require("../validators/order.validator");

const createOrder = async (req, res) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const order = await orderService.createOrderFromCart(req.user.id, value);

    return res.status(201).json({
      message: "Tạo đơn hàng thành công",
      data: {
        order,
        checkout: {
          items: order.items,
          pricing: {
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
          },
        },
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await orderService.getMyOrders(req.user.id);

    return res.json({
      message: "Lấy danh sách đơn hàng thành công",
      data: orders,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const isAdmin = ["admin", "staff"].includes(req.user.role);
    const order = await orderService.getOrderById(
      req.user.id,
      req.params.id,
      isAdmin
    );

    return res.json({
      message: "Lấy chi tiết đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { error, value } = updateOrderStatusSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const order = await orderService.updateOrderStatus(
      req.user,
      req.params.id,
      value
    );

    return res.json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { error, value } = cancelOrderSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const isAdmin = ["admin", "staff"].includes(req.user.role);
    const order = await orderService.cancelOrder(
      req.user,
      req.params.id,
      value,
      isAdmin
    );

    return res.json({
      message: "Hủy đơn hàng thành công",
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderDetail,
  updateOrderStatus,
  cancelOrder,
};