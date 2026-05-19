const mongoose = require("mongoose");
const inventoryService = require("../services/inventory.service");

const getInventories = async (req, res) => {
  try {
    const result = await inventoryService.getInventories(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tồn kho thành công",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy danh sách tồn kho thất bại",
    });
  }
};

const getInventoryByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "productId không hợp lệ",
      });
    }

    const inventory = await inventoryService.getInventoryByProductId(productId);

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết tồn kho thành công",
      data: inventory,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Không tìm thấy tồn kho",
    });
  }
};

const importStock = async (req, res) => {
  try {
    const inventory = await inventoryService.importStock(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Nhập kho thành công",
      data: inventory,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Nhập kho thất bại",
    });
  }
};

const adjustStock = async (req, res) => {
  try {
    const inventory = await inventoryService.adjustStock(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Điều chỉnh tồn kho thành công",
      data: inventory,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Điều chỉnh tồn kho thất bại",
    });
  }
};

const getInventoryLogs = async (req, res) => {
  try {
    const result = await inventoryService.getInventoryLogs(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử kho thành công",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Lấy lịch sử kho thất bại",
    });
  }
};

module.exports = {
  getInventories,
  getInventoryByProductId,
  importStock,
  adjustStock,
  getInventoryLogs,
};