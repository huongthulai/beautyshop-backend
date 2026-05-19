const Joi = require("joi");

const addressSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(6).max(20).required(),
  addressLine: Joi.string().trim().min(3).max(255).required(),
  ward: Joi.string().trim().allow("").optional(),
  district: Joi.string().trim().allow("").optional(),
  province: Joi.string().trim().allow("").optional(),
  note: Joi.string().trim().allow("").optional(),
  isDefault: Joi.boolean().optional(),
});

const createAddressSchema = addressSchema;
const updateAddressSchema = addressSchema.fork(
  ["fullName", "phone", "addressLine"],
  (field) => field.optional()
);

module.exports = {
  createAddressSchema,
  updateAddressSchema,
};
