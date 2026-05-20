const cartService = require("../services/cart.service");
const {
  addCartItemSchema,
  updateCartItemSchema,
  toggleSelectCartItemSchema,
  checkoutPreviewSchema,
} = require("../validators/cart.validator");

const getMyCart = async (req, res) => {
  try {
    const cart = await cartService.getCartByUser(req.user.id);
    return res.json({
      message: "Lấy giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const addItem = async (req, res) => {
  try {
    const { error, value } = addCartItemSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const cart = await cartService.addItemToCart(req.user.id, value);
    return res.status(201).json({
      message: "Thêm sản phẩm vào giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const { error, value } = updateCartItemSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const cart = await cartService.updateCartItem(
      req.user.id,
      req.params.itemId,
      value
    );

    return res.json({
      message: "Cập nhật giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const removeItem = async (req, res) => {
  try {
    const cart = await cartService.removeCartItem(req.user.id, req.params.itemId);

    return res.json({
      message: "Xóa sản phẩm khỏi giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const clearMyCart = async (req, res) => {
  try {
    const cart = await cartService.clearCart(req.user.id);

    return res.json({
      message: "Xóa toàn bộ giỏ hàng thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const toggleSelectItem = async (req, res) => {
  try {
    const { error, value } = toggleSelectCartItemSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const cart = await cartService.toggleSelectCartItem(
      req.user.id,
      req.params.itemId,
      value
    );

    return res.json({
      message: "Cập nhật trạng thái chọn sản phẩm thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const selectAllItems = async (req, res) => {
  try {
    const { error, value } = toggleSelectCartItemSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const cart = await cartService.selectAllCartItems(req.user.id, value);

    return res.json({
      message: "Cập nhật trạng thái chọn tất cả sản phẩm thành công",
      data: cart,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getCheckoutPreview = async (req, res) => {
  try {
    const { error, value } = checkoutPreviewSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const preview = await cartService.getCheckoutPreview(req.user.id, value);

    return res.json({
      message: "Lấy thông tin checkout thành công",
      data: preview,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  clearMyCart,
  toggleSelectItem,
  selectAllItems,
  getCheckoutPreview,
};