const productService = require("../services/product.service");
const { productSchema, updateProductSchema } = require("../validators/product.validator");

const getProducts = async (req, res) => {
  try {
    const result = await productService.getProducts(req.query);

    return res.json({
      message: "Lấy danh sách sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const getProductDetail = async (req, res) => {
  try {
    const data = await productService.getProductDetail(req.params.identifier);

    return res.status(200).json({
      message: "Lấy chi tiết sản phẩm thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { error, value } = productSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const product = await productService.createProduct(value);

    return res.status(201).json({
      message: "Tạo sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const product = await productService.updateProduct(req.params.id, value);

    return res.json({
      message: "Cập nhật sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    next(error); 
  }
};

const deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id);

    return res.json({
      message: result.message,
    });
  } catch (error) {
    return res.status(404).json({
      message: error.message,
    });
  }
};
const getProductSuggestions = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const result = await productService.getProductSuggestions(keyword);

    return res.status(200).json({
      success: true,
      message: "Lấy gợi ý sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Lấy gợi ý sản phẩm thất bại",
    });
  }
};

module.exports = {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductSuggestions,
};