const Category = require("../models/Category");

const normalizeSlug = (value = "") => {
  return value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const getCategories = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const items = await Category.find(filter).sort({ name: 1 });
  return items;
};

const createCategory = async (payload) => {
  const { name, slug, description, status } = payload;

  if (!name?.trim()) {
    throw new Error("Tên danh mục là bắt buộc");
  }

  const finalSlug = normalizeSlug(slug || name);
  if (!finalSlug) {
    throw new Error("Slug không hợp lệ");
  }

  const existedName = await Category.findOne({ name: name.trim() });
  if (existedName) {
    throw new Error("Tên danh mục đã tồn tại");
  }

  const existedSlug = await Category.findOne({ slug: finalSlug });
  if (existedSlug) {
    throw new Error("Slug danh mục đã tồn tại");
  }

  const category = await Category.create({
    name: name.trim(),
    slug: finalSlug,
    description: description?.trim() || "",
    status: status || "active",
  });

  return category;
};

const updateCategory = async (id, payload) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new Error("Không tìm thấy danh mục");
  }

  if (payload.name !== undefined) {
    if (!payload.name?.trim()) {
      throw new Error("Tên danh mục không được để trống");
    }

    const existedName = await Category.findOne({
      name: payload.name.trim(),
      _id: { $ne: id },
    });

    if (existedName) {
      throw new Error("Tên danh mục đã tồn tại");
    }

    category.name = payload.name.trim();
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const finalSlug = normalizeSlug(payload.slug || category.name);

    if (!finalSlug) {
      throw new Error("Slug không hợp lệ");
    }

    const existedSlug = await Category.findOne({
      slug: finalSlug,
      _id: { $ne: id },
    });

    if (existedSlug) {
      throw new Error("Slug danh mục đã tồn tại");
    }

    category.slug = finalSlug;
  }

  if (payload.description !== undefined) {
    category.description = payload.description?.trim() || "";
  }

  if (payload.status !== undefined) {
    category.status = payload.status;
  }

  await category.save();
  return category;
};

const deleteCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new Error("Không tìm thấy danh mục");
  }

  await category.deleteOne();

  return { message: "Xóa danh mục thành công" };
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};