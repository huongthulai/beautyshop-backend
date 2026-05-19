const categoryService = require("../services/category.service");

const getCategories = async (req, res) => {
  try {
    const items = await categoryService.getCategories(req.query);

    return res.json({
      message: "Lấy danh sách danh mục thành công",
      data: items,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);

    return res.status(201).json({
      message: "Tạo danh mục thành công",
      data: category,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);

    return res.json({
      message: "Cập nhật danh mục thành công",
      data: category,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const result = await categoryService.deleteCategory(req.params.id);

    return res.json({
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};