const express = require("express");
const wishlistController = require("../controllers/wishlist.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", wishlistController.getMyWishlist);
router.get("/check/:productId", wishlistController.checkWishlistItem);
router.post("/", wishlistController.addToWishlist);
router.post("/toggle", wishlistController.toggleWishlist);
router.delete("/:productId", wishlistController.removeFromWishlist);

module.exports = router;