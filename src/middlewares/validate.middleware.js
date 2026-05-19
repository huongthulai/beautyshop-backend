const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // lấy tất cả lỗi
      stripUnknown: true, // loại bỏ field không hợp lệ
    });

    if (error) {
      const errors = error.details.map((err) => ({
        message: err.message,
        field: err.path.join("."),
      }));

      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // ghi đè dữ liệu đã được sanitize
    req[property] = value;

    next();
  };
};

module.exports = validate;