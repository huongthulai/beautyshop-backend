const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const getTopProducts = async ({ limit = 3 } = {}) => {
  const finalLimit = Math.max(Number(limit) || 3, 1);

  const data = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$items.name" },
        totalSoldQty: { $sum: "$items.qty" },
        totalRevenue: { $sum: "$items.lineTotal" },
      },
    },
    { $sort: { totalSoldQty: -1, totalRevenue: -1 } },
    { $limit: finalLimit },
  ]);

  return data;
};

const getDashboardSummary = async () => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenueResult,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    paidOrders,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]),
    Order.countDocuments({ fulfillmentStatus: "pending" }),
    Order.countDocuments({ fulfillmentStatus: "delivered" }),
    Order.countDocuments({ fulfillmentStatus: "cancelled" }),
    Order.countDocuments({ paymentStatus: "paid" }),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "orderCode customerSnapshot totalAmount paymentStatus fulfillmentStatus createdAt"
      ),
    getTopProducts({ limit: 3 }),
  ]);

  return {
    overview: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenueResult[0]?.totalRevenue || 0,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      paidOrders,
    },
    recentOrders,
    topProducts,
  };
};

const getRevenueByDateRange = async ({ from, to }) => {
  const match = {};

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  match.paymentStatus = "paid";

  const data = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1,
      },
    },
  ]);

  return data.map((item) => ({
    date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
      item._id.day
    ).padStart(2, "0")}`,
    revenue: item.revenue,
    orders: item.orders,
  }));
};

module.exports = {
  getDashboardSummary,
  getRevenueByDateRange,
  getTopProducts,
};