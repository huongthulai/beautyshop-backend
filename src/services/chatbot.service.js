const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ChatMessage = require("../models/ChatMessage");
const ChatKnowledge = require("../models/ChatKnowledge");

const normalizeText = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const escapeRegex = (text = "") =>
  text.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const detectOrderCode = (message = "") => {
  const match = message.match(/ORD\d{8}\d{4}/i);
  return match ? match[0].toUpperCase() : null;
};

const buildProductLink = (product) => `/products/${product.slug || product._id}`;

const buildNeedAdminReply = () =>
  "Mình chưa có câu trả lời chính xác cho câu hỏi này. Mình đã ghi nhận và nhân viên BeautyShop sẽ trả lời bạn sớm nhất tại khung chat này nhé.";

const getProductKeyword = (message = "") => {
  const normalized = normalizeText(message);

  const keywordMap = [
    { keys: ["da dau", "dau nhon", "kiem dau"], value: "da dầu" },
    { keys: ["da kho", "cap am", "duong am"], value: "da khô" },
    { keys: ["son do", "mau do"], value: "son đỏ" },
    { keys: ["kem nen", "foundation"], value: "kem nền" },
    { keys: ["chong nang", "kem chong nang"], value: "chống nắng" },
    { keys: ["tay trang", "nuoc tay trang"], value: "tẩy trang" },
    { keys: ["serum"], value: "serum" },
    { keys: ["sua rua mat"], value: "sữa rửa mặt" },
  ];

  const matched = keywordMap.find((item) =>
    item.keys.some((key) => normalized.includes(key))
  );

  if (matched) return matched.value;

  return message
    .replace(/tư vấn|tu van|gợi ý|goi y|sản phẩm|san pham/gi, "")
    .trim();
};

const suggestProducts = async (message) => {
  const keyword = getProductKeyword(message);
  const safeKeyword = escapeRegex(keyword);

  const products = await Product.find({
    status: "active",
    $or: [
      { name: { $regex: safeKeyword, $options: "i" } },
      { description: { $regex: safeKeyword, $options: "i" } },
      { tags: { $regex: safeKeyword, $options: "i" } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  if (!products.length) {
    return {
      intent: "product_suggestion",
      status: "need_admin",
      reply:
        "Mình chưa tìm thấy sản phẩm thật phù hợp với từ khóa này. Mình đã chuyển câu hỏi cho nhân viên để tư vấn kỹ hơn cho bạn nhé.",
      metadata: {
        keyword,
        products: [],
      },
    };
  }

  const productLines = products
    .map((item, index) => {
      const price = Number(
        item.finalPrice || item.originalPrice || 0
      ).toLocaleString("vi-VN");

      return `${index + 1}. ${item.name} - ${price}đ\n${buildProductLink(item)}`;
    })
    .join("\n\n");

  return {
    intent: "product_suggestion",
    status: "bot_answered",
    reply: `Mình gợi ý cho bạn một số sản phẩm phù hợp:\n\n${productLines}`,
    metadata: {
      keyword,
      products: products.map((item) => ({
        id: item._id,
        name: item.name,
        slug: item.slug,
        image: item.images?.[0] || "",
        price: item.finalPrice || item.originalPrice,
        link: buildProductLink(item),
      })),
    },
  };
};

const lookupOrder = async ({ userId, message }) => {
  const orderCode = detectOrderCode(message);

  if (!orderCode) {
    return {
      intent: "order_lookup",
      status: "bot_answered",
      reply:
        "Bạn vui lòng nhập mã đơn hàng theo dạng ORD..., ví dụ: ORD202605201234 để mình tra cứu nhé.",
      metadata: {},
    };
  }

  const filter = { orderCode };
  if (userId) filter.userId = userId;

  const order = await Order.findOne(filter).lean();

  if (!order) {
    return {
      intent: "order_lookup",
      status: "need_admin",
      reply:
        "Mình chưa tìm thấy đơn hàng này. Mình đã ghi nhận để nhân viên kiểm tra lại giúp bạn. Bạn cũng có thể kiểm tra lại mã đơn hoặc đăng nhập đúng tài khoản đã đặt hàng nhé.",
      metadata: {
        orderCode,
      },
    };
  }

  const statusMap = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    shipped: "Đang giao hàng",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy",
  };

  return {
    intent: "order_lookup",
    status: "bot_answered",
    reply: `Đơn hàng ${order.orderCode} hiện đang ở trạng thái: ${
      statusMap[order.fulfillmentStatus] || order.fulfillmentStatus
    }.\nTổng tiền: ${Number(order.totalAmount || 0).toLocaleString(
      "vi-VN"
    )}đ.\nThanh toán: ${order.paymentStatus}.`,
    metadata: {
      orderCode: order.orderCode,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
    },
  };
};

const findKnowledgeReply = async (message) => {
  const normalizedMessage = normalizeText(message);

  const knowledgeItems = await ChatKnowledge.find({
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  let bestMatch = null;
  let bestScore = 0;

  for (const item of knowledgeItems) {
    let score = 0;

    const keywords = item.keywords || [];

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);

      if (!normalizedKeyword) continue;

      if (normalizedMessage.includes(normalizedKeyword)) {
        score += 3;
      }
    }

    const normalizedQuestion = normalizeText(item.question || "");

    if (normalizedQuestion && normalizedMessage.includes(normalizedQuestion)) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (!bestMatch || bestScore <= 0) {
    return null;
  }

  const categoryToIntentMap = {
    policy: "policy",
    payment: "policy",
    shipping: "policy",
    order: "order_lookup",
    product_advice: "product_suggestion",
    skin_care: "product_suggestion",
    general: "general",
  };

  return {
    intent: categoryToIntentMap[bestMatch.category] || "general",
    status: "bot_answered",
    reply: bestMatch.answer,
    metadata: {
      knowledgeId: bestMatch._id,
      knowledgeCategory: bestMatch.category,
      matchedKeywords: bestMatch.keywords || [],
      score: bestScore,
    },
  };
};

const getPolicyReply = (message) => {
  const normalized = normalizeText(message);

  if (normalized.includes("doi tra") || normalized.includes("hoan hang")) {
    return "BeautyShop hỗ trợ đổi trả trong 7 ngày nếu sản phẩm còn nguyên tem, chưa qua sử dụng và lỗi đến từ nhà sản xuất.";
  }

  if (
    normalized.includes("ship") ||
    normalized.includes("van chuyen") ||
    normalized.includes("giao hang") ||
    normalized.includes("phi ship")
  ) {
    return "Phí vận chuyển sẽ được hiển thị ở bước thanh toán. Một số chương trình có thể hỗ trợ freeship theo giá trị đơn hàng.";
  }

  if (normalized.includes("thanh toan") || normalized.includes("cod")) {
    return "BeautyShop hỗ trợ COD, chuyển khoản, MoMo và VNPay. Với thanh toán online, đơn hàng sẽ ở trạng thái chờ xác nhận thanh toán.";
  }

  return null;
};

const handleChat = async ({ userId = null, sessionId = null, message }) => {
  const text = message?.trim();

  if (!text) {
    throw new Error("Vui lòng nhập nội dung tin nhắn");
  }

  const normalized = normalizeText(text);

  const hasOrderIntent =
    normalized.includes("don hang") ||
    normalized.includes("ma don") ||
    normalized.includes("theo doi don") ||
    /ORD\d{8}\d{4}/i.test(text);

  const hasProductIntent =
    normalized.includes("goi y") ||
    normalized.includes("tu van") ||
    normalized.includes("da dau") ||
    normalized.includes("da kho") ||
    normalized.includes("son") ||
    normalized.includes("kem nen") ||
    normalized.includes("san pham") ||
    normalized.includes("chong nang") ||
    normalized.includes("tay trang") ||
    normalized.includes("serum") ||
    normalized.includes("sua rua mat");

  let result;

  if (hasOrderIntent) {
    result = await lookupOrder({ userId, message: text });
  } else if (hasProductIntent) {
    result = await suggestProducts(text);
  } else {
    const policyReply = getPolicyReply(text);

    if (policyReply) {
      result = {
        intent: "policy",
        status: "bot_answered",
        reply: policyReply,
        metadata: {},
      };
    } else {
      const knowledgeReply = await findKnowledgeReply(text);

      if (knowledgeReply) {
        result = knowledgeReply;
      } else {
        result = {
          intent: "general",
          status: "need_admin",
          reply: buildNeedAdminReply(),
          metadata: {},
        };
      }
    }
  }

  const savedMessage = await ChatMessage.create({
    userId,
    sessionId: sessionId || null,
    userMessage: text,
    botReply: result.reply,
    intent: result.intent,
    status: result.status || "bot_answered",
    metadata: result.metadata || {},
  });

  return {
    id: savedMessage._id,
    reply: result.reply,
    intent: result.intent,
    status: result.status || "bot_answered",
    metadata: result.metadata || {},
    createdAt: savedMessage.createdAt,
  };
};

const buildHistoryFilter = (query = {}) => {
  const filter = {};

  if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
    filter.userId = query.userId;
  }

  if (query.intent) filter.intent = query.intent;
  if (query.status) filter.status = query.status;

  if (query.keyword) {
    const safeKeyword = escapeRegex(query.keyword.trim());

    filter.$or = [
      { userMessage: { $regex: safeKeyword, $options: "i" } },
      { botReply: { $regex: safeKeyword, $options: "i" } },
      { adminReply: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  return filter;
};

const getChatHistory = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = buildHistoryFilter(query);

  const [items, total] = await Promise.all([
    ChatMessage.find(filter)
      .populate("userId", "name email phone role")
      .populate("repliedBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatMessage.countDocuments(filter),
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

const getUserChatHistory = async ({
  userId = null,
  sessionId = null,
  page = 1,
  limit = 30,
}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const filter = userId ? { userId } : { sessionId: sessionId || null };

  if (!filter.userId && !filter.sessionId) {
    return {
      items: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const [items, total] = await Promise.all([
    ChatMessage.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    ChatMessage.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const replyChatMessage = async ({ messageId, adminId, reply }) => {
  const text = reply?.trim();

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw new Error("Mã tin nhắn không hợp lệ");
  }

  if (!text) {
    throw new Error("Vui lòng nhập nội dung trả lời");
  }

  const updated = await ChatMessage.findByIdAndUpdate(
    messageId,
    {
      adminReply: text,
      repliedBy: adminId,
      repliedAt: new Date(),
      status: "admin_answered",
    },
    { new: true }
  )
    .populate("userId", "name email phone role")
    .populate("repliedBy", "name email role")
    .lean();

  if (!updated) {
    throw new Error("Không tìm thấy tin nhắn cần trả lời");
  }

  return updated;
};

const createKnowledge = async (payload = {}) => {
  const question = payload.question?.trim();
  const answer = payload.answer?.trim();

  if (!question) {
    throw new Error("Vui lòng nhập câu hỏi mẫu");
  }

  if (!answer) {
    throw new Error("Vui lòng nhập câu trả lời");
  }

  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords
        .map((item) => item?.toString().trim())
        .filter(Boolean)
    : [];

  const knowledge = await ChatKnowledge.create({
    question,
    answer,
    keywords,
    category: payload.category || "general",
    isActive:
      typeof payload.isActive === "boolean" ? payload.isActive : true,
  });

  return knowledge;
};

const getKnowledgeList = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }

  if (query.isActive === "true") {
    filter.isActive = true;
  }

  if (query.isActive === "false") {
    filter.isActive = false;
  }

  if (query.keyword) {
    const safeKeyword = escapeRegex(query.keyword.trim());

    filter.$or = [
      { question: { $regex: safeKeyword, $options: "i" } },
      { answer: { $regex: safeKeyword, $options: "i" } },
      { keywords: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    ChatKnowledge.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatKnowledge.countDocuments(filter),
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

const updateKnowledge = async (knowledgeId, payload = {}) => {
  if (!mongoose.Types.ObjectId.isValid(knowledgeId)) {
    throw new Error("Mã kiến thức không hợp lệ");
  }

  const updateData = {};

  if (payload.question !== undefined) {
    const question = payload.question?.trim();

    if (!question) {
      throw new Error("Câu hỏi mẫu không được để trống");
    }

    updateData.question = question;
  }

  if (payload.answer !== undefined) {
    const answer = payload.answer?.trim();

    if (!answer) {
      throw new Error("Câu trả lời không được để trống");
    }

    updateData.answer = answer;
  }

  if (payload.keywords !== undefined) {
    updateData.keywords = Array.isArray(payload.keywords)
      ? payload.keywords
          .map((item) => item?.toString().trim())
          .filter(Boolean)
      : [];
  }

  if (payload.category !== undefined) {
    updateData.category = payload.category || "general";
  }

  if (payload.isActive !== undefined) {
    updateData.isActive = Boolean(payload.isActive);
  }

  const updated = await ChatKnowledge.findByIdAndUpdate(
    knowledgeId,
    updateData,
    { new: true }
  ).lean();

  if (!updated) {
    throw new Error("Không tìm thấy kiến thức chatbot");
  }

  return updated;
};

const deleteKnowledge = async (knowledgeId) => {
  if (!mongoose.Types.ObjectId.isValid(knowledgeId)) {
    throw new Error("Mã kiến thức không hợp lệ");
  }

  const deleted = await ChatKnowledge.findByIdAndDelete(knowledgeId).lean();

  if (!deleted) {
    throw new Error("Không tìm thấy kiến thức chatbot");
  }

  return deleted;
};

module.exports = {
  handleChat,
  getChatHistory,
  getUserChatHistory,
  replyChatMessage,
  createKnowledge,
  getKnowledgeList,
  updateKnowledge,
  deleteKnowledge,
};