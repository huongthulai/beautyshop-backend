const Joi = require("joi");

const baseProductSchema = {
  sku: Joi.string().trim().optional(),

  slug: Joi.string().trim().optional(),

  name: Joi.string().trim().min(2).max(200),

  description: Joi.string().allow("").optional(),

  brandId: Joi.string().allow(null, "").optional(),

  categoryId: Joi.string().allow(null, "").optional(),

  originalPrice: Joi.number().min(0),

  salePercent: Joi.number().min(0).max(100).optional(),

  saleStartAt: Joi.date().allow(null, "").optional(),

  saleEndAt: Joi.date().allow(null, "").optional(),

  images: Joi.array().items(Joi.string().uri()).optional(),

  tags: Joi.array().items(Joi.string().trim()).optional(),

  volumeWeightOptions: Joi.array().items(Joi.string().trim()).optional(),

  colorOptions: Joi.array().items(Joi.string().trim()).optional(),

  status: Joi.string()
    .valid("draft", "active", "out_of_stock", "inactive", "archived")
    .optional(),
};

const productSchema = Joi.object({
  ...baseProductSchema,
  name: baseProductSchema.name.required(),
  originalPrice: baseProductSchema.originalPrice.required(),
}).custom((value, helpers) => {
  if (value.saleStartAt && value.saleEndAt) {
    const start = new Date(value.saleStartAt);
    const end = new Date(value.saleEndAt);

    if (start.getTime() > end.getTime()) {
      return helpers.error("any.invalid", {
        message: "saleEndAt phải lớn hơn hoặc bằng saleStartAt",
      });
    }
  }

  return value;
});

const updateProductSchema = Joi.object({
  ...baseProductSchema,
}).custom((value, helpers) => {
  if (value.saleStartAt && value.saleEndAt) {
    const start = new Date(value.saleStartAt);
    const end = new Date(value.saleEndAt);

    if (start.getTime() > end.getTime()) {
      return helpers.error("any.invalid", {
        message: "saleEndAt phải lớn hơn hoặc bằng saleStartAt",
      });
    }
  }

  return value;
});

module.exports = {
  productSchema,
  updateProductSchema,
};