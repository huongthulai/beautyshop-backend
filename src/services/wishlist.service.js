const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({
      userId,
      items: [],
    });
  }

  return wishlist;
};

const getMyWishlist = async (userId) => {
  const wishlist = await getOrCreateWishlist(userId);

  await wishlist.populate({
    path: "items.productId",
    populate: [
      { path: "brandId", select: "name slug" },
      { path: "categoryId", select: "name slug" },
    ],
  });

  wishlist.items = wishlist.items.filter((item) => item.productId);

  if (wishlist.isModified()) {
    await wishlist.save();
  }

  return wishlist;
};

const addToWishlist = async (userId, productId) => {
  if (!productId) {
    throw new Error("Thiếu productId");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const wishlist = await getOrCreateWishlist(userId);

  const existedItem = wishlist.items.find(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existedItem) {
    await wishlist.populate({
      path: "items.productId",
      populate: [
        { path: "brandId", select: "name slug" },
        { path: "categoryId", select: "name slug" },
      ],
    });
    return wishlist;
  }

  wishlist.items.unshift({
    productId: product._id,
    addedAt: new Date(),
  });

  await wishlist.save();

  await wishlist.populate({
    path: "items.productId",
    populate: [
      { path: "brandId", select: "name slug" },
      { path: "categoryId", select: "name slug" },
    ],
  });

  return wishlist;
};

const removeFromWishlist = async (userId, productId) => {
  if (!productId) {
    throw new Error("Thiếu productId");
  }

  const wishlist = await getOrCreateWishlist(userId);

  const itemIndex = wishlist.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new Error("Sản phẩm không có trong wishlist");
  }

  wishlist.items.splice(itemIndex, 1);
  await wishlist.save();

  await wishlist.populate({
    path: "items.productId",
    populate: [
      { path: "brandId", select: "name slug" },
      { path: "categoryId", select: "name slug" },
    ],
  });

  return wishlist;
};

const toggleWishlist = async (userId, productId) => {
  if (!productId) {
    throw new Error("Thiếu productId");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error("Không tìm thấy sản phẩm");
  }

  const wishlist = await getOrCreateWishlist(userId);

  const existedItemIndex = wishlist.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  let isWishlisted = false;

  if (existedItemIndex !== -1) {
    wishlist.items.splice(existedItemIndex, 1);
    isWishlisted = false;
  } else {
    wishlist.items.unshift({
      productId: product._id,
      addedAt: new Date(),
    });
    isWishlisted = true;
  }

  await wishlist.save();

  await wishlist.populate({
    path: "items.productId",
    populate: [
      { path: "brandId", select: "name slug" },
      { path: "categoryId", select: "name slug" },
    ],
  });

  return {
    isWishlisted,
    wishlist,
  };
};

const checkWishlistItem = async (userId, productId) => {
  if (!productId) {
    throw new Error("Thiếu productId");
  }

  const wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    return { isWishlisted: false };
  }

  const isWishlisted = wishlist.items.some(
    (item) => item.productId.toString() === productId.toString()
  );

  return { isWishlisted };
};

module.exports = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlistItem,
};