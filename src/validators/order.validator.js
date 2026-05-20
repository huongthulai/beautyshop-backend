const Joi = require("joi");

const shippingAddressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(6).max(20).required(),
  addressLine: Joi.string().trim().min(3).max(255).required(),
  ward: Joi.string().trim().allow("").optional(),
  district: Joi.string().trim().allow("").optional(),
  province: Joi.string().trim().allow("").optional(),
  note: Joi.string().trim().allow("").optional(),
});

const createOrderSchema = Joi.object({
  shippingAddress: shippingAddressSchema.required(),
  paymentMethod: Joi.string()
    .valid("cod", "bank_transfer", "momo", "vnpay")
    .optional(),
  shippingFee: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
  voucherCode: Joi.string().trim().uppercase().allow("", null).optional(),
  note: Joi.string().trim().allow("").optional(),
});

const updateOrderStatusSchema = Joi.object({
  fulfillmentStatus: Joi.string()
    .valid("pending", "processing", "shipped", "delivered", "cancelled")
    .optional(),
  paymentStatus: Joi.string()
    .valid("unpaid", "pending", "paid", "failed", "refunded")
    .optional(),
  note: Joi.string().trim().allow("").optional(),
}).or("fulfillmentStatus", "paymentStatus", "note");

const cancelOrderSchema = Joi.object({
  note: Joi.string().trim().allow("").optional(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
};