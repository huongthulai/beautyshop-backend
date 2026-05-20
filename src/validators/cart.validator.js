const Joi = require("joi");

const addCartItemSchema = Joi.object({
  productId: Joi.string().trim().required(),
  qty: Joi.number().integer().min(1).required(),
  volumeWeight: Joi.string().trim().optional().allow(""),
  color: Joi.string().trim().optional().allow(""),
});

const updateCartItemSchema = Joi.object({
  qty: Joi.number().integer().min(1).required(),
});

const toggleSelectCartItemSchema = Joi.object({
  isSelected: Joi.boolean().required(),
});

const checkoutPreviewSchema = Joi.object({
  shippingFee: Joi.number().min(0).optional(),
  discountAmount: Joi.number().min(0).optional(),
});

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  toggleSelectCartItemSchema,
  checkoutPreviewSchema,
};