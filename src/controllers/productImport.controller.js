const fs = require("fs");
const { importProductsFromCsv } = require("../services/productImport.service");

const importProductsByCsv = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file CSV",
      });
    }

    filePath = req.file.path;

    const result = await importProductsFromCsv(filePath);

    return res.status(201).json({
      success: true,
      message: "Import sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Import CSV thất bại",
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = {
  importProductsByCsv,
};