const stringSimilarity = require("string-similarity");
const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const slugify = (str = "") =>
  str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeText = (str = "") =>
  str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");

const escapeRegex = (str = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizeKeyword = (keyword = "") =>
  normalizeText(keyword)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

const isSaleActive = (product) => {
  const salePercent = Number(product?.salePercent || 0);
  if (salePercent <= 0) return false;

  const now = new Date();
  const saleStartAt = product?.saleStartAt ? new Date(product.saleStartAt) : null;
  const saleEndAt = product?.saleEndAt ? new Date(product.saleEndAt) : null;

  if (saleStartAt && now < saleStartAt) return false;
  if (saleEndAt && now > saleEndAt) return false;

  return true;
};

const calculateFinalPrice = (product) => {
  const originalPrice = Number(product?.originalPrice || 0);
  const salePercent = Number(product?.salePercent || 0);

  if (!isSaleActive(product)) return originalPrice;

  const discounted = originalPrice - (originalPrice * salePercent) / 100;
  return Math.max(0, Math.round(discounted));
};

const applyPriceFields = (product) => {
  const plain =
    typeof product.toObject === "function" ? product.toObject() : { ...product };

  plain.isSaleActive = isSaleActive(plain);
  plain.finalPrice = calculateFinalPrice(plain);

  return plain;
};

const generateUniqueSlug = async (name, excludeId = null) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await Product.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const generateSku = () => {
  const now = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SP${now}${random}`;
};

const buildKeywordMongoFilter = (keyword = "") => {
  const normalizedKeyword = normalizeText(keyword);
  const tokens = tokenizeKeyword(keyword);

  if (!normalizedKeyword || !tokens.length) return null;

  const tokenOrConditions = [];

  for (const token of tokens) {
    const pattern = escapeRegex(token);

    tokenOrConditions.push(
      { name: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { sku: { $regex: pattern, $options: "i" } },
      { slug: { $regex: pattern, $options: "i" } }
    );
  }

  return {
    $or: tokenOrConditions,
  };
};

const scoreProductSimilarity = (product, keyword = "") => {
  const normalizedKeyword = normalizeText(keyword);
  const tokens = tokenizeKeyword(keyword);

  if (!normalizedKeyword) return 0;

  const name = normalizeText(product?.name || "");
  const slug = normalizeText(product?.slug || "");
  const description = normalizeText(product?.description || "");
  const brandName = normalizeText(product?.brandId?.name || "");
  const categoryName = normalizeText(product?.categoryId?.name || "");

  let score = 0;

  const directNameScore = stringSimilarity.compareTwoStrings(normalizedKeyword, name);
  const directSlugScore = stringSimilarity.compareTwoStrings(normalizedKeyword, slug);
  const directBrandScore = stringSimilarity.compareTwoStrings(normalizedKeyword, brandName);
  const directCategoryScore = stringSimilarity.compareTwoStrings(normalizedKeyword, categoryName);

  score += directNameScore * 7;
  score += directSlugScore * 5;
  score += directBrandScore * 2.5;
  score += directCategoryScore * 2;

  for (const token of tokens) {
    if (name.includes(token)) score += 2.5;
    if (slug.includes(token)) score += 1.8;
    if (description.includes(token)) score += 1.2;
    if (brandName.includes(token)) score += 1.3;
    if (categoryName.includes(token)) score += 1.1;

    score += stringSimilarity.compareTwoStrings(token, name) * 1.3;
    score += stringSimilarity.compareTwoStrings(token, slug) * 1.0;
  }

  return score;
};

const buildProductFilter = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.brandId && isValidObjectId(query.brandId)) {
    filter.brandId = query.brandId;
  }

  if (query.categoryId && isValidObjectId(query.categoryId)) {
    filter.categoryId = query.categoryId;
  }

  if (query.brand) {
    const brand = await Brand.findOne({ slug: query.brand });
    filter.brandId = brand ? brand._id : null;
  }

  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    filter.categoryId = category ? category._id : null;
  }

  if (query.saleOnly === "true") {
    filter.salePercent = { $gt: 0 };
  }

  return filter;
};

const createProduct = async (payload) => {
  const {
    name,
    description,
    images = [],
    brandId,
    categoryId,
    originalPrice = 0,
    salePercent = 0,
    saleStartAt = null,
    saleEndAt = null,
    status = "active",
  } = payload;

  if (!name?.trim()) {
    throw new Error("Tên sản phẩm là bắt buộc");
  }

  if (brandId && !isValidObjectId(brandId)) {
    throw new Error("brandId không hợp lệ");
  }

  if (categoryId && !isValidObjectId(categoryId)) {
    throw new Error("categoryId không hợp lệ");
  }

  if (brandId) {
    const brand = await Brand.findById(brandId);
    if (!brand) throw new Error("Không tìm thấy thương hiệu");
  }

  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error("Không tìm thấy danh mục");
  }

  const slug = await generateUniqueSlug(name);
  const sku = generateSku();

  const product = await Product.create({
    name: name.trim(),
    slug,
    sku,
    description,
    images,
    brandId,
    categoryId,
    originalPrice,
    salePercent,
    saleStartAt,
    saleEndAt,
    status,
  });

  const populated = await Product.findById(product._id)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug");

  return applyPriceFields(populated);
};

const getProducts = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 12);
  const skip = (page - 1) * limit;

  const filter = await buildProductFilter(query);
  const keywordMongoFilter = buildKeywordMongoFilter(query.keyword || "");

  let finalFilter = { ...filter };
  if (keywordMongoFilter) {
    finalFilter = {
      $and: [filter, keywordMongoFilter],
    };
  }

  let sort = { createdAt: -1 };

  switch (query.sort) {
    case "oldest":
      sort = { createdAt: 1 };
      break;
    case "name_asc":
      sort = { name: 1 };
      break;
    case "name_desc":
      sort = { name: -1 };
      break;
    case "hot_sale":
      sort = { salePercent: -1, createdAt: -1 };
      break;
    default:
      sort = { createdAt: -1 };
      break;
  }

  let products = await Product.find(finalFilter)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .sort(sort);

  let mapped = products.map(applyPriceFields);

  if (query.minPrice) {
    mapped = mapped.filter(
      (item) => Number(item.finalPrice || 0) >= Number(query.minPrice)
    );
  }

  if (query.maxPrice) {
    mapped = mapped.filter(
      (item) => Number(item.finalPrice || 0) <= Number(query.maxPrice)
    );
  }

  if (query.saleOnly === "true") {
    mapped = mapped.filter((item) => item.isSaleActive);
  }

  if (query.keyword?.trim()) {
    const normalizedKeyword = normalizeText(query.keyword);
    const exactTokenMatched = mapped.filter((item) => {
      const name = normalizeText(item.name || "");
      const slug = normalizeText(item.slug || "");
      const description = normalizeText(item.description || "");
      const brand = normalizeText(item.brandId?.name || "");
      const category = normalizeText(item.categoryId?.name || "");

      return (
        name.includes(normalizedKeyword) ||
        slug.includes(normalizedKeyword) ||
        description.includes(normalizedKeyword) ||
        brand.includes(normalizedKeyword) ||
        category.includes(normalizedKeyword)
      );
    });

    if (exactTokenMatched.length > 0) {
      mapped = exactTokenMatched;
    } else {
      const fuzzyScored = mapped
        .map((item) => ({
          ...item,
          _searchScore: scoreProductSimilarity(item, query.keyword),
        }))
        .filter((item) => item._searchScore >= 1.2)
        .sort((a, b) => b._searchScore - a._searchScore);

      mapped = fuzzyScored;
    }
  }

  if (query.sort === "price_asc") {
    mapped.sort((a, b) => Number(a.finalPrice || 0) - Number(b.finalPrice || 0));
  }

  if (query.sort === "price_desc") {
    mapped.sort((a, b) => Number(b.finalPrice || 0) - Number(a.finalPrice || 0));
  }

  const total = mapped.length;
  const items = mapped.slice(skip, skip + limit);

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

const getProductById = async (id) => {
  if (!isValidObjectId(id)) {
    throw new Error("ID sản phẩm không hợp lệ");
  }

  const product = await Product.findById(id)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug");

  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  return applyPriceFields(product);
};

const getProductDetail = async (identifier) => {
  let product = null;

  if (isValidObjectId(identifier)) {
    product = await Product.findById(identifier)
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug");
  }

  if (!product) {
    product = await Product.findOne({ slug: identifier })
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug");
  }

  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  return applyPriceFields(product);
};

const updateProduct = async (id, payload) => {
  if (!isValidObjectId(id)) {
    throw new Error("ID sản phẩm không hợp lệ");
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const nextData = { ...payload };

  if (payload.name && payload.name.trim() !== product.name) {
    nextData.slug = await generateUniqueSlug(payload.name, product._id);
  }

  if (payload.brandId) {
    if (!isValidObjectId(payload.brandId)) {
      throw new Error("brandId không hợp lệ");
    }
    const brand = await Brand.findById(payload.brandId);
    if (!brand) throw new Error("Không tìm thấy thương hiệu");
  }

  if (payload.categoryId) {
    if (!isValidObjectId(payload.categoryId)) {
      throw new Error("categoryId không hợp lệ");
    }
    const category = await Category.findById(payload.categoryId);
    if (!category) throw new Error("Không tìm thấy danh mục");
  }

  await Product.findByIdAndUpdate(id, nextData, { new: true });

  const updated = await Product.findById(id)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug");

  return applyPriceFields(updated);
};

const deleteProduct = async (id) => {
  if (!isValidObjectId(id)) {
    throw new Error("ID sản phẩm không hợp lệ");
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  await Product.findByIdAndDelete(id);

  return { deleted: true };
};

const getProductSuggestions = async (keyword = "") => {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return [];
  }

  const tokenFilter = buildKeywordMongoFilter(keyword);
  let mongoFilter = { status: "active" };

  if (tokenFilter) {
    mongoFilter = {
      $and: [{ status: "active" }, tokenFilter],
    };
  }

  let products = await Product.find(mongoFilter)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .sort({ createdAt: -1 })
    .limit(20);

  let mapped = products.map(applyPriceFields);

  if (!mapped.length) {
    const fallbackProducts = await Product.find({ status: "active" })
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(60);

    mapped = fallbackProducts
      .map(applyPriceFields)
      .map((item) => ({
        ...item,
        _searchScore: scoreProductSimilarity(item, keyword),
      }))
      .filter((item) => item._searchScore >= 1.15)
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, 8);
  } else {
    mapped = mapped
      .map((item) => ({
        ...item,
        _searchScore: scoreProductSimilarity(item, keyword),
      }))
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, 8);
  }

  return mapped.map((item) => ({
    _id: item._id,
    name: item.name,
    slug: item.slug,
    image: item.images?.[0] || "",
    finalPrice: item.finalPrice,
    originalPrice: item.originalPrice,
    salePercent: item.salePercent,
    brandName: item.brandId?.name || "",
    categoryName: item.categoryId?.name || "",
  }));
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductDetail,
  updateProduct,
  deleteProduct,
  getProductSuggestions,
};