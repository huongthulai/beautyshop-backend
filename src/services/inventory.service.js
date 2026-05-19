const Inventory = require("../models/Inventory");
const InventoryLog = require("../models/InventoryLog");
const Product = require("../models/Product");

const syncProductStatus = async (productId, stock) => {
  if (stock <= 0) {
    await Product.findByIdAndUpdate(productId, { status: "out_of_stock" });
  } else {
    await Product.findByIdAndUpdate(productId, { status: "active" });
  }
};

const getInventories = async (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.productId) {
    filter.productId = query.productId;
  }

  const [items, total] = await Promise.all([
    Inventory.find(filter)
      .populate(
        "productId",
        "sku slug name originalPrice salePercent finalPrice status brandId categoryId"
      )
      .populate("lastUpdatedBy", "name email role")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Inventory.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getInventoryByProductId = async (productId) => {
  const inventory = await Inventory.findOne({ productId })
    .populate(
      "productId",
      "sku slug name originalPrice salePercent finalPrice status brandId categoryId"
    )
    .populate("lastUpdatedBy", "name email role");

  if (!inventory) {
    throw new Error("Không tìm thấy tồn kho của sản phẩm");
  }

  return inventory;
};

const ensureInventoryExists = async (productId, actorId) => {
  let inventory = await Inventory.findOne({ productId });

  if (!inventory) {
    inventory = await Inventory.create({
      productId,
      stock: 0,
      reserved: 0,
      lastUpdatedBy: actorId || null,
    });
  }

  return inventory;
};

const importStock = async (actorId, payload) => {
  const { productId, qty, note = "" } = payload;

  const quantity = Number(qty);

  if (!productId) {
    throw new Error("Thiếu productId");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("qty phải là số nguyên lớn hơn 0");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const inventory = await ensureInventoryExists(productId, actorId);

  const before = inventory.stock;
  inventory.stock = before + quantity;
  inventory.lastUpdatedBy = actorId;
  await inventory.save();

  await InventoryLog.create({
    productId,
    type: "in",
    qty: quantity,
    before,
    after: inventory.stock,
    note: note || `Nhập kho cho sản phẩm ${product.name}`,
    ref: {
      orderId: null,
    },
    createdBy: actorId,
  });

  await syncProductStatus(productId, inventory.stock);

  return inventory;
};

const adjustStock = async (actorId, payload) => {
  const { productId, newStock, note = "" } = payload;

  const finalStock = Number(newStock);

  if (!productId) {
    throw new Error("Thiếu productId");
  }

  if (!Number.isInteger(finalStock) || finalStock < 0) {
    throw new Error("newStock phải là số nguyên >= 0");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const inventory = await ensureInventoryExists(productId, actorId);

  const before = inventory.stock;
  inventory.stock = finalStock;
  inventory.lastUpdatedBy = actorId;

  if (inventory.reserved > inventory.stock) {
    inventory.reserved = inventory.stock;
  }

  await inventory.save();

  await InventoryLog.create({
    productId,
    type: "adjust",
    qty: Math.abs(finalStock - before),
    before,
    after: inventory.stock,
    note: note || `Điều chỉnh tồn kho cho sản phẩm ${product.name}`,
    ref: {
      orderId: null,
    },
    createdBy: actorId,
  });

  await syncProductStatus(productId, inventory.stock);

  return inventory;
};

const getInventoryLogs = async (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 20, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.productId) {
    filter.productId = query.productId;
  }

  if (query.type) {
    filter.type = query.type;
  }

  const [items, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate("productId", "sku slug name brandId categoryId")
      .populate("createdBy", "name email role")
      .populate("ref.orderId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryLog.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getInventories,
  getInventoryByProductId,
  importStock,
  adjustStock,
  getInventoryLogs,
};