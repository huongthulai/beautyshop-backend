const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");

const checkCanReviewProduct = async ({ userId, productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Mã sản phẩm không hợp lệ");
  }

  const order = await Order.findOne({
    userId,
    paymentStatus: "paid",
    fulfillmentStatus: "delivered",
    "items.productId": productId,
  }).sort({ createdAt: -1 });

  if (!order) {
    return {
      canReview: false,
      order: null,
      message:
        "Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã giao và thanh toán thành công.",
    };
  }

  const existedReview = await Review.findOne({
    userId,
    productId,
    orderId: order._id,
  });

  if (existedReview) {
    return {
      canReview: false,
      order,
      existedReview,
      message: "Bạn đã đánh giá sản phẩm này trong đơn hàng gần nhất.",
    };
  }

  return {
    canReview: true,
    order,
    message: "Bạn có thể đánh giá sản phẩm này.",
  };
};

const createReview = async ({ userId, productId, rating, comment }) => {
  const canReviewResult = await checkCanReviewProduct({ userId, productId });

  if (!canReviewResult.canReview) {
    throw new Error(canReviewResult.message);
  }

  const review = await Review.create({
    productId,
    userId,
    orderId: canReviewResult.order._id,
    rating,
    comment,
  });

  return review.populate("userId", "name avatar");
};

const getProductReviews = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Mã sản phẩm không hợp lệ");
  }

  const reviews = await Review.find({
    productId,
    isVisible: true,
  })
    .populate("userId", "name avatar")
    .sort({ createdAt: -1 })
    .lean();

  const totalReviews = reviews.length;

  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
        totalReviews
      : 0;

  return {
    reviews,
    totalReviews,
    averageRating: Number(averageRating.toFixed(1)),
  };
};

module.exports = {
  checkCanReviewProduct,
  createReview,
  getProductReviews,
};