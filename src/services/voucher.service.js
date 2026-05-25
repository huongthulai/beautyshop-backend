const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const User = require("../models/User");

const cleanObjectIdList = (list = []) => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => item?.toString())
    .filter((item) => mongoose.Types.ObjectId.isValid(item));
};

const normalizeVoucherPayload = (payload = {}) => {
  const discountType = payload.discountType || "fixed";
  const applyScope = payload.applyScope || "all";

  const data = {
    code: payload.code?.trim()?.toUpperCase(),
    name: payload.name?.trim(),
    discountType,
    discountValue: Number(payload.discountValue || 0),
    minOrderValue: Number(payload.minOrderValue || 0),
    maxDiscount:
      discountType === "percent" &&
      payload.maxDiscount !== null &&
      payload.maxDiscount !== ""
        ? Number(payload.maxDiscount || 0)
        : null,
    usageLimit: Number(payload.usageLimit || 0),
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    endDate: payload.endDate ? new Date(payload.endDate) : null,
    isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
    applicableTiers:
      Array.isArray(payload.applicableTiers) && payload.applicableTiers.length
        ? payload.applicableTiers
        : ["regular", "vip", "vvip"],
    applyScope,
    applicableProducts:
      applyScope === "product"
        ? cleanObjectIdList(payload.applicableProducts)
        : [],
    applicableCategories:
      applyScope === "category"
        ? cleanObjectIdList(payload.applicableCategories)
        : [],
    applicableBrands:
      applyScope === "brand" ? cleanObjectIdList(payload.applicableBrands) : [],
  };

  return data;
};

const validateVoucherPayload = (data = {}) => {
  if (!data.code) {
    throw new Error("Vui lòng nhập mã voucher");
  }

  if (!data.name) {
    throw new Error("Vui lòng nhập tên voucher");
  }

  if (!["fixed", "percent"].includes(data.discountType)) {
    throw new Error("Kiểu giảm giá không hợp lệ");
  }

  if (Number(data.discountValue) <= 0) {
    throw new Error("Giá trị giảm phải lớn hơn 0");
  }

  if (
    data.discountType === "percent" &&
    (Number(data.discountValue) <= 0 || Number(data.discountValue) > 100)
  ) {
    throw new Error("Phần trăm giảm phải từ 1 đến 100");
  }

  if (Number(data.minOrderValue) < 0) {
    throw new Error("Đơn tối thiểu không hợp lệ");
  }

  if (Number(data.usageLimit) < 0) {
    throw new Error("Giới hạn lượt dùng không hợp lệ");
  }

  if (!Array.isArray(data.applicableTiers) || !data.applicableTiers.length) {
    throw new Error("Vui lòng chọn ít nhất 1 nhóm khách hàng");
  }

  const validTiers = ["regular", "vip", "vvip"];
  const invalidTier = data.applicableTiers.find(
    (tier) => !validTiers.includes(tier)
  );

  if (invalidTier) {
    throw new Error("Nhóm khách hàng áp dụng không hợp lệ");
  }

  if (!["all", "product", "category", "brand"].includes(data.applyScope)) {
    throw new Error("Phạm vi áp dụng không hợp lệ");
  }

  if (data.applyScope === "product" && !data.applicableProducts.length) {
    throw new Error("Vui lòng chọn ít nhất 1 sản phẩm áp dụng");
  }

  if (data.applyScope === "category" && !data.applicableCategories.length) {
    throw new Error("Vui lòng chọn ít nhất 1 danh mục áp dụng");
  }

  if (data.applyScope === "brand" && !data.applicableBrands.length) {
    throw new Error("Vui lòng chọn ít nhất 1 thương hiệu áp dụng");
  }

  if (data.startDate && Number.isNaN(data.startDate.getTime())) {
    throw new Error("Thời gian bắt đầu không hợp lệ");
  }

  if (data.endDate && Number.isNaN(data.endDate.getTime())) {
    throw new Error("Thời gian kết thúc không hợp lệ");
  }

  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }
};

const populateVoucherQuery = (query) =>
  query
    .populate("applicableProducts", "name slug sku finalPrice originalPrice")
    .populate("applicableCategories", "name slug")
    .populate("applicableBrands", "name slug");

const createVoucher = async (payload = {}) => {
  const data = normalizeVoucherPayload(payload);
  validateVoucherPayload(data);

  const existed = await Voucher.findOne({ code: data.code });

  if (existed) {
    throw new Error("Mã voucher đã tồn tại");
  }

  const voucher = await Voucher.create(data);

  return populateVoucherQuery(Voucher.findById(voucher._id)).lean();
};

const getVouchers = async (query = {}) => {
  const filter = {};

  if (query.keyword) {
    const keyword = query.keyword.trim();
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
    ];
  }

  if (query.status === "true") {
    filter.isActive = true;
  }

  if (query.status === "false") {
    filter.isActive = false;
  }

  if (query.applyScope) {
    filter.applyScope = query.applyScope;
  }

  return populateVoucherQuery(
    Voucher.find(filter).sort({ createdAt: -1 })
  ).lean();
};

const getVoucherById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Mã voucher không hợp lệ");
  }

  const voucher = await populateVoucherQuery(Voucher.findById(id)).lean();

  if (!voucher) {
    throw new Error("Không tìm thấy voucher");
  }

  return voucher;
};

const updateVoucher = async (id, payload = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Mã voucher không hợp lệ");
  }

  const data = normalizeVoucherPayload(payload);
  validateVoucherPayload(data);

  const existed = await Voucher.findOne({
    code: data.code,
    _id: { $ne: id },
  });

  if (existed) {
    throw new Error("Mã voucher đã tồn tại");
  }

  const updated = await Voucher.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw new Error("Không tìm thấy voucher");
  }

  return populateVoucherQuery(Voucher.findById(updated._id)).lean();
};

const deleteVoucher = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Mã voucher không hợp lệ");
  }

  const deleted = await Voucher.findByIdAndDelete(id).lean();

  if (!deleted) {
    throw new Error("Không tìm thấy voucher");
  }

  return deleted;
};

const getIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const getItemLineTotal = (item) => {
  return Number(item.lineTotal || 0);
};

const getProductBrandId = (product) => {
  return getIdString(
    product?.brandId ||
      product?.brand ||
      product?.brand_id ||
      product?.brandRef ||
      product?.brand_id
  );
};

const getProductCategoryId = (product) => {
  return getIdString(
    product?.categoryId ||
      product?.category ||
      product?.category_id ||
      product?.categoryRef
  );
};


const getUserMembershipTier = async (user) => {
  if (user?.membershipTier) {
    return String(user.membershipTier).toLowerCase();
  }

  const userId = user?._id || user?.id;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const userDoc = await User.findById(userId).select("membershipTier").lean();

    if (userDoc?.membershipTier) {
      return String(userDoc.membershipTier).toLowerCase();
    }
  }

  return "regular";
};

const getEligibleItemsByVoucher = async (voucher, cart = {}) => {
  const items = Array.isArray(cart.items) ? cart.items : [];

  if (!items.length) return [];

  if (!voucher || voucher.applyScope === "all") {
    return items;
  }

  const productIds = items
    .map((item) => getIdString(item.productId || item.product))
    .filter(Boolean);

  if (!productIds.length) return [];

  if (voucher.applyScope === "product") {
    const allowedProductIds = new Set(
      (voucher.applicableProducts || []).map((id) => getIdString(id))
    );

    return items.filter((item) => {
      const productId = getIdString(item.productId || item.product);
      return allowedProductIds.has(productId);
    });
  }

  const products = await Product.find({
    _id: { $in: productIds },
  }).select("_id categoryId category category_id categoryRef brandId brand brand_id brandRef");

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  if (voucher.applyScope === "category") {
    const allowedCategoryIds = new Set(
      (voucher.applicableCategories || []).map((id) => getIdString(id))
    );

    return items.filter((item) => {
      const productId = getIdString(item.productId || item.product);
      const product = productMap.get(productId);
      const categoryId = getProductCategoryId(product);

      return allowedCategoryIds.has(categoryId);
    });
  }

  if (voucher.applyScope === "brand") {
    const allowedBrandIds = new Set(
      (voucher.applicableBrands || []).map((id) => getIdString(id))
    );

    return items.filter((item) => {
      const productId = getIdString(item.productId || item.product);
      const product = productMap.get(productId);
      const brandId = getProductBrandId(product);

      return allowedBrandIds.has(brandId);
    });
  }

  return [];
};

const getEligibleSubtotalByVoucher = async (voucher, cart = {}) => {
  const eligibleItems = await getEligibleItemsByVoucher(voucher, cart);

  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + getItemLineTotal(item),
    0
  );

  return {
    eligibleItems,
    eligibleSubtotal,
  };
};

const validateVoucher = async ({ code, user, cart }) => {
  if (!code?.trim()) {
    throw new Error("Vui lòng nhập mã voucher");
  }

  const voucher = await Voucher.findOne({
    code: code.trim().toUpperCase(),
  });

  if (!voucher) {
    throw new Error("Voucher không tồn tại");
  }

  if (!voucher.isActive) {
    throw new Error("Voucher đã bị tắt");
  }

  const now = new Date();

  if (voucher.startDate && now < voucher.startDate) {
    throw new Error("Voucher chưa bắt đầu");
  }

  if (voucher.endDate && now > voucher.endDate) {
    throw new Error("Voucher đã hết hạn");
  }

  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    throw new Error("Voucher đã hết lượt sử dụng");
  }

  const userTier = await getUserMembershipTier(user);
  const applicableTiers = Array.isArray(voucher.applicableTiers)
    ? voucher.applicableTiers.map((tier) => String(tier).toLowerCase())
    : [];

  if (applicableTiers.length > 0 && !applicableTiers.includes(userTier)) {
    throw new Error("Voucher không áp dụng cho tài khoản của bạn");
  }

  const { eligibleItems, eligibleSubtotal } = await getEligibleSubtotalByVoucher(
    voucher,
    cart
  );

  if (eligibleSubtotal <= 0) {
    if (voucher.applyScope === "product") {
      throw new Error("Voucher không áp dụng cho các sản phẩm đã chọn");
    }

    if (voucher.applyScope === "category") {
      throw new Error("Voucher không áp dụng cho danh mục sản phẩm trong giỏ hàng");
    }

    if (voucher.applyScope === "brand") {
      throw new Error("Voucher không áp dụng cho thương hiệu sản phẩm trong giỏ hàng");
    }

    throw new Error("Voucher không áp dụng cho đơn hàng này");
  }

  if (Number(eligibleSubtotal || 0) < Number(voucher.minOrderValue || 0)) {
    throw new Error(
      `Sản phẩm áp dụng voucher chưa đạt giá trị tối thiểu ${Number(
        voucher.minOrderValue || 0
      ).toLocaleString("vi-VN")} đ`
    );
  }

  voucher.$locals = voucher.$locals || {};
  voucher.$locals.eligibleItems = eligibleItems;
  voucher.$locals.eligibleSubtotal = eligibleSubtotal;

  return voucher;
};

const calculateDiscount = (voucher, cart = {}) => {
  const eligibleSubtotal = Number(
    voucher?.$locals?.eligibleSubtotal ??
      voucher?._eligibleSubtotal ??
      cart?.eligibleSubtotal ??
      0
  );

  let discount = 0;

  if (voucher.discountType === "fixed") {
    discount = Number(voucher.discountValue || 0);
  } else if (voucher.discountType === "percent") {
    discount = (eligibleSubtotal * Number(voucher.discountValue || 0)) / 100;

    if (voucher.maxDiscount !== null && voucher.maxDiscount !== undefined) {
      discount = Math.min(discount, Number(voucher.maxDiscount || 0));
    }
  }

  discount = Math.floor(discount);

  if (discount > eligibleSubtotal) {
    discount = eligibleSubtotal;
  }

  return Math.max(discount, 0);
};

module.exports = {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  calculateDiscount,
};