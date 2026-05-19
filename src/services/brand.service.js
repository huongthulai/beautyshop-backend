const Brand = require("../models/Brand");

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

const getBrands = async (query = {}) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const items = await Brand.find(filter).sort({ name: 1 });
  return items;
};

const createBrand = async (payload) => {
  const { name, slug, description, logo, status } = payload;

  if (!name?.trim()) {
    throw new Error("Tên thương hiệu là bắt buộc");
  }

  const finalSlug = normalizeSlug(slug || name);
  if (!finalSlug) {
    throw new Error("Slug không hợp lệ");
  }

  const existedName = await Brand.findOne({ name: name.trim() });
  if (existedName) {
    throw new Error("Tên thương hiệu đã tồn tại");
  }

  const existedSlug = await Brand.findOne({ slug: finalSlug });
  if (existedSlug) {
    throw new Error("Slug thương hiệu đã tồn tại");
  }

  const brand = await Brand.create({
    name: name.trim(),
    slug: finalSlug,
    description: description?.trim() || "",
    logo: logo?.trim() || "",
    status: status || "active",
  });

  return brand;
};

const updateBrand = async (id, payload) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new Error("Không tìm thấy thương hiệu");
  }

  if (payload.name !== undefined) {
    if (!payload.name?.trim()) {
      throw new Error("Tên thương hiệu không được để trống");
    }

    const existedName = await Brand.findOne({
      name: payload.name.trim(),
      _id: { $ne: id },
    });

    if (existedName) {
      throw new Error("Tên thương hiệu đã tồn tại");
    }

    brand.name = payload.name.trim();
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const finalSlug = normalizeSlug(payload.slug || brand.name);

    if (!finalSlug) {
      throw new Error("Slug không hợp lệ");
    }

    const existedSlug = await Brand.findOne({
      slug: finalSlug,
      _id: { $ne: id },
    });

    if (existedSlug) {
      throw new Error("Slug thương hiệu đã tồn tại");
    }

    brand.slug = finalSlug;
  }

  if (payload.description !== undefined) {
    brand.description = payload.description?.trim() || "";
  }

  if (payload.logo !== undefined) {
    brand.logo = payload.logo?.trim() || "";
  }

  if (payload.status !== undefined) {
    brand.status = payload.status;
  }

  await brand.save();
  return brand;
};

const deleteBrand = async (id) => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new Error("Không tìm thấy thương hiệu");
  }

  await brand.deleteOne();

  return { message: "Xóa thương hiệu thành công" };
};

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};