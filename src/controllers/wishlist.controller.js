const wishlistService = require("../services/wishlist.service");

const getMyWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.getMyWishlist(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lấy wishlist thành công",
      data: wishlist,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Lấy wishlist thất bại",
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.addToWishlist(
      req.user.id,
      req.body.productId
    );

    return res.status(200).json({
      success: true,
      message: "Thêm sản phẩm vào wishlist thành công",
      data: wishlist,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Thêm vào wishlist thất bại",
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await wishlistService.removeFromWishlist(
      req.user.id,
      req.params.productId
    );

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm khỏi wishlist thành công",
      data: wishlist,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Xóa khỏi wishlist thất bại",
    });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const result = await wishlistService.toggleWishlist(
      req.user.id,
      req.body.productId
    );

    return res.status(200).json({
      success: true,
      message: result.isWishlisted
        ? "Đã thêm sản phẩm vào wishlist"
        : "Đã xóa sản phẩm khỏi wishlist",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Cập nhật wishlist thất bại",
    });
  }
};

const checkWishlistItem = async (req, res) => {
  try {
    const result = await wishlistService.checkWishlistItem(
      req.user.id,
      req.params.productId
    );

    return res.status(200).json({
      success: true,
      message: "Kiểm tra wishlist thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Kiểm tra wishlist thất bại",
    });
  }
};

module.exports = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlistItem,
};