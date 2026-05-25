const express = require("express");
const router = express.Router();

const {
  checkCanReview,
  createReview,
  getProductReviews,
} = require("../controllers/review.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/products/:productId/reviews", getProductReviews);

router.get("/products/:productId/reviews/can-review", verifyToken, checkCanReview);

router.post("/products/:productId/reviews", verifyToken, createReview);

module.exports = router;