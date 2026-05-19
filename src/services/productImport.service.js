const fs = require("fs");
const csv = require("csv-parser");
const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Category = require("../models/Category");

const generateSku = async () => {
  const now = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  const sku = `SP${now}${random}`;

  const existed = await Product.findOne({ sku });
  if (existed) {
    return generateSku();
  }

  return sku;
};

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

const ensureUniqueSlug = async (slug) => {
  let finalSlug = slug;
  let counter = 1;

  while (true) {
    const existing = await Product.findOne({ slug: finalSlug });
    if (!existing) return finalSlug;

    finalSlug = `${slug}-${counter}`;
    counter += 1;
  }
};

const parseCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
};

const findBrandId = async (row) => {
  if (row.brandId?.trim()) {
    return row.brandId.trim();
  }

  if (row.brand?.trim()) {
    const brand = await Brand.findOne({
      name: { $regex: `^${row.brand.trim()}$`, $options: "i" },
    });
    return brand?._id || null;
  }

  return null;
};

const findCategoryId = async (row) => {
  if (row.categoryId?.trim()) {
    return row.categoryId.trim();
  }

  if (row.category?.trim()) {
    const category = await Category.findOne({
      name: { $regex: `^${row.category.trim()}$`, $options: "i" },
    });
    return category?._id || null;
  }

  return null;
};

const importProductsFromCsv = async (filePath) => {
  const rows = await parseCsvFile(filePath);

  const createdProducts = [];
  const skippedRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      const name = row.name?.trim();
      const originalPrice = Number(row.originalPrice ?? row.price ?? 0);
      const salePercent = Number(row.salePercent ?? 0);

      if (!name) {
        skippedRows.push({
          row: i + 1,
          reason: "Thiếu name",
          data: row,
        });
        continue;
      }

      if (Number.isNaN(originalPrice) || originalPrice < 0) {
        skippedRows.push({
          row: i + 1,
          reason: "originalPrice không hợp lệ",
          data: row,
        });
        continue;
      }

      if (Number.isNaN(salePercent) || salePercent < 0 || salePercent > 100) {
        skippedRows.push({
          row: i + 1,
          reason: "salePercent phải từ 0 đến 100",
          data: row,
        });
        continue;
      }

      const sku = row.sku?.trim()?.toUpperCase() || (await generateSku());

      const existedSku = await Product.findOne({ sku });
      if (existedSku) {
        skippedRows.push({
          row: i + 1,
          reason: `SKU đã tồn tại: ${sku}`,
          data: row,
        });
        continue;
      }

      const baseSlug = normalizeSlug(row.slug?.trim() || name);
      if (!baseSlug) {
        skippedRows.push({
          row: i + 1,
          reason: "slug không hợp lệ",
          data: row,
        });
        continue;
      }

      const slug = await ensureUniqueSlug(baseSlug);
      const brandId = await findBrandId(row);
      const categoryId = await findCategoryId(row);

      const saleStartAt = row.saleStartAt ? new Date(row.saleStartAt) : null;
      const saleEndAt = row.saleEndAt ? new Date(row.saleEndAt) : null;

      if (
        saleStartAt &&
        saleEndAt &&
        saleStartAt.getTime() > saleEndAt.getTime()
      ) {
        skippedRows.push({
          row: i + 1,
          reason: "saleEndAt phải lớn hơn hoặc bằng saleStartAt",
          data: row,
        });
        continue;
      }

      const product = await Product.create({
        sku,
        slug,
        name,
        description: row.description?.trim() || "",
        brandId: brandId || null,
        categoryId: categoryId || null,
        originalPrice,
        salePercent,
        saleStartAt,
        saleEndAt,
        images: row.images
          ? row.images.split("|").map((item) => item.trim()).filter(Boolean)
          : [],
        tags: row.tags
          ? row.tags.split("|").map((item) => item.trim()).filter(Boolean)
          : [],
        status: row.status?.trim() || "draft",
      });

      createdProducts.push(product);
    } catch (error) {
      skippedRows.push({
        row: i + 1,
        reason: error.message,
        data: row,
      });
    }
  }

  return {
    totalRows: rows.length,
    createdCount: createdProducts.length,
    skippedCount: skippedRows.length,
    createdProducts,
    skippedRows,
  };
};

module.exports = {
  importProductsFromCsv,
};