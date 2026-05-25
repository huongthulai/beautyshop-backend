const {
  checkCanReviewProduct,
  createReview,
  getProductReviews,
} = require("../services/review.service");

const checkCanReview = async (req, res) => {
  try {
    const data = await checkCanReviewProduct({
      userId: req.user.id,
      productId: req.params.productId,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không kiểm tra được quyền đánh giá",
    });
  }
};

const createReviewHandler = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const data = await createReview({
      userId: req.user.id,
      productId: req.params.productId,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Đánh giá sản phẩm thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không thể đánh giá sản phẩm",
    });
  }
};

const getProductReviewsHandler = async (req, res) => {
  try {
    const data = await getProductReviews(req.params.productId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được đánh giá sản phẩm",
    });
  }
};

module.exports = {
  checkCanReview,
  createReview: createReviewHandler,
  getProductReviews: getProductReviewsHandler,
};