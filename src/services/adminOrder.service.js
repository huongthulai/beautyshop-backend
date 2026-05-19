const Order = require("../models/Order");

const getAllOrders = async (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 20, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.fulfillmentStatus) {
    filter.fulfillmentStatus = query.fulfillmentStatus;
  }

  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    filter.$or = [
      { orderCode: { $regex: keyword, $options: "i" } },
      { "customerSnapshot.name": { $regex: keyword, $options: "i" } },
      { "customerSnapshot.email": { $regex: keyword, $options: "i" } },
      { "customerSnapshot.phone": { $regex: keyword, $options: "i" } },
      { "items.name": { $regex: keyword, $options: "i" } },
      { "items.sku": { $regex: keyword, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getAllOrders,
};