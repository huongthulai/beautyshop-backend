const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file ảnh",
      });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Upload ảnh thành công",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: imageUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Upload ảnh thất bại",
    });
  }
};

module.exports = {
  uploadSingleImage,
};