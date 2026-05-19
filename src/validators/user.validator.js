const Joi = require("joi");

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().allow("").optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(50).required(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
};