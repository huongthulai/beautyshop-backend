const bannerService = require("../services/banner.service");

const getBanners = async (req, res) => {
  try {
    const data = await bannerService.getBanners(req.query);

    return res.json({
      success: true,
      message: "Lấy danh sách banner thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getActiveBanners = async (req, res) => {
  try {
    const data = await bannerService.getActiveBanners(req.query);

    return res.json({
      success: true,
      message: "Lấy banner active thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const createBanner = async (req, res) => {
  try {
    const data = await bannerService.createBanner(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo banner thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateBanner = async (req, res) => {
  try {
    const data = await bannerService.updateBanner(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Cập nhật banner thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const data = await bannerService.deleteBanner(req.params.id);

    return res.json({
      success: true,
      message: "Xóa banner thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};