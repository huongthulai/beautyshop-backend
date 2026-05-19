const brandService = require("../services/brand.service");

const getBrands = async (req, res) => {
  try {
    const items = await brandService.getBrands(req.query);

    return res.json({
      message: "Lấy danh sách thương hiệu thành công",
      data: items,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const createBrand = async (req, res) => {
  try {
    const brand = await brandService.createBrand(req.body);

    return res.status(201).json({
      message: "Tạo thương hiệu thành công",
      data: brand,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const updateBrand = async (req, res) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);

    return res.json({
      message: "Cập nhật thương hiệu thành công",
      data: brand,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const result = await brandService.deleteBrand(req.params.id);

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
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};