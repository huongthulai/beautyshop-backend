const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");

const getProductActivePrice = (product) => {
  return Number(product.finalPrice) || Number(product.originalPrice) || 0;
};

const syncCartItemWithProduct = (item, product) => {
  const finalPrice = getProductActivePrice(product);

  item.sku = product.sku;
  item.name = product.name;
  item.image = Array.isArray(product.images) ? product.images[0] || "" : "";
  item.originalPrice = Number(product.originalPrice) || 0;
  item.salePercent = Number(product.salePercent) || 0;
  item.finalPrice = finalPrice;
  item.price = finalPrice;
  item.lineTotal = finalPrice * item.qty;
};

const recalculateCart = (cart) => {
  cart.recalculateTotals();
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [],
      totalQty: 0,
      totalPrice: 0,
      selectedQty: 0,
      selectedTotalPrice: 0,
    });
  }

  return cart;
};

const getCartByUser = async (userId) => {
  const cart = await getOrCreateCart(userId);
  return cart;
};

const ensureProductCanBuy = async (productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  if (product.status !== "active") {
    throw new Error("Sản phẩm hiện không khả dụng");
  }

  const inventory = await Inventory.findOne({ productId });
  if (!inventory) {
    throw new Error("Sản phẩm chưa có tồn kho");
  }

  if (inventory.stock < quantity) {
    throw new Error(`Sản phẩm ${product.name} chỉ còn ${inventory.stock} trong kho`);
  }

  return { product, inventory };
};

const addItemToCart = async (userId, { productId, qty }) => {
  const quantity = Number(qty);

  if (!productId) {
    throw new Error("Thiếu productId");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Số lượng phải là số nguyên lớn hơn 0");
  }

  const { product, inventory } = await ensureProductCanBuy(productId, quantity);
  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItem) {
    const newQty = existingItem.qty + quantity;

    if (inventory.stock < newQty) {
      throw new Error(`Sản phẩm ${product.name} chỉ còn ${inventory.stock} trong kho`);
    }

    existingItem.qty = newQty;
    syncCartItemWithProduct(existingItem, product);
  } else {
    cart.items.push({
      productId: product._id,
      sku: product.sku,
      name: product.name,
      image: Array.isArray(product.images) ? product.images[0] || "" : "",
      originalPrice: Number(product.originalPrice) || 0,
      salePercent: Number(product.salePercent) || 0,
      finalPrice: getProductActivePrice(product),
      price: getProductActivePrice(product),
      qty: quantity,
      lineTotal: getProductActivePrice(product) * quantity,
      isSelected: true,
    });
  }

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const updateCartItem = async (userId, productId, { qty }) => {
  const quantity = Number(qty);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Số lượng phải là số nguyên lớn hơn 0");
  }

  const cart = await getOrCreateCart(userId);

  const item = cart.items.find(
    (cartItem) => cartItem.productId.toString() === productId.toString()
  );

  if (!item) {
    throw new Error("Sản phẩm không có trong giỏ hàng");
  }

  const { product } = await ensureProductCanBuy(productId, quantity);

  item.qty = quantity;
  syncCartItemWithProduct(item, product);

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const removeCartItem = async (userId, productId) => {
  const cart = await getOrCreateCart(userId);

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new Error("Sản phẩm không có trong giỏ hàng");
  }

  cart.items.splice(itemIndex, 1);

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const clearCart = async (userId) => {
  const cart = await getOrCreateCart(userId);

  cart.items = [];
  cart.totalQty = 0;
  cart.totalPrice = 0;
  cart.selectedQty = 0;
  cart.selectedTotalPrice = 0;

  await cart.save();

  return cart;
};

const toggleSelectCartItem = async (userId, productId, { isSelected }) => {
  const cart = await getOrCreateCart(userId);

  const item = cart.items.find(
    (cartItem) => cartItem.productId.toString() === productId.toString()
  );

  if (!item) {
    throw new Error("Sản phẩm không có trong giỏ hàng");
  }

  if (typeof isSelected !== "boolean") {
    throw new Error("isSelected phải là boolean");
  }

  item.isSelected = isSelected;

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const selectAllCartItems = async (userId, { isSelected }) => {
  const cart = await getOrCreateCart(userId);

  if (typeof isSelected !== "boolean") {
    throw new Error("isSelected phải là boolean");
  }

  cart.items.forEach((item) => {
    item.isSelected = isSelected;
  });

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const refreshCartPrices = async (cart) => {
  if (!cart.items.length) {
    recalculateCart(cart);
    return cart;
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  cart.items = cart.items.filter((item) => {
    const product = productMap.get(item.productId.toString());
    if (!product || product.status !== "active") {
      return false;
    }

    syncCartItemWithProduct(item, product);
    return true;
  });

  recalculateCart(cart);
  await cart.save();

  return cart;
};

const getCheckoutPreview = async (userId, payload = {}) => {
  const cart = await getOrCreateCart(userId);
  await refreshCartPrices(cart);

  const selectedItems = cart.items.filter((item) => item.isSelected);

  if (selectedItems.length === 0) {
    throw new Error("Chưa chọn sản phẩm để thanh toán");
  }

  const shippingFee = Math.max(Number(payload.shippingFee) || 0, 0);
  const discountAmount = Math.max(Number(payload.discountAmount) || 0, 0);

  const subtotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

  return {
    items: selectedItems,
    pricing: {
      subtotal,
      shippingFee,
      discountAmount,
      totalAmount,
    },
    summary: {
      totalQty: selectedItems.reduce((sum, item) => sum + item.qty, 0),
      totalItems: selectedItems.length,
    },
  };
};

module.exports = {
  getCartByUser,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  toggleSelectCartItem,
  selectAllCartItems,
  getCheckoutPreview,
  refreshCartPrices,
};