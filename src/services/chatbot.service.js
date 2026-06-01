const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ChatMessage = require("../models/ChatMessage");
const ChatKnowledge = require("../models/ChatKnowledge");
const geminiService = require("./gemini.service");

let Category = null;
let Brand = null;

try {
  Category = require("../models/Category");
} catch (error) {
  Category = null;
}

try {
  Brand = require("../models/Brand");
} catch (error) {
  Brand = null;
}

const normalizeText = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const escapeRegex = (text = "") =>
  text.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const detectOrderCode = (message = "") => {
  const match = message.match(/ORD\d{8}\d{4}/i);
  return match ? match[0].toUpperCase() : null;
};

const buildProductLink = (product) => `/products/${product.slug || product._id}`;
const buildCategoryLink = (category) => `/products?category=${category.slug}`;
const buildBrandLink = (brand) => `/products?brand=${brand.slug}`;

const buildNeedAdminReply = () =>
  "Mình chưa có câu trả lời chính xác cho câu hỏi này. Mình đã ghi nhận và nhân viên BeautyShop sẽ trả lời bạn sớm nhất tại khung chat này nhé.";

const stripRawInternalLinks = (reply = "") =>
  reply
    .toString()
    .replace(/\n?\/products\?[^\n\s]+/gi, "")
    .replace(/\n?\/products\/[A-Za-z0-9_-]+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const PRODUCT_KEYWORD_MAP = [
  {
    keys: ["da dau", "dau nhon", "kiem dau", "mụn", "mun"],
    value: "kiềm dầu",
    extraKeywords: ["da dầu", "kiềm dầu", "oil control", "mụn"],
  },
  {
    keys: ["da kho", "cap am", "duong am", "kho da"],
    value: "cấp ẩm",
    extraKeywords: ["cấp ẩm", "dưỡng ẩm", "hydration", "moisturizer"],
  },
  {
    keys: ["da nhay cam", "nhay cam", "kich ung"],
    value: "dịu nhẹ",
    extraKeywords: ["dịu nhẹ", "sensitive", "phục hồi", "làm dịu"],
  },
  {
    keys: ["son do", "mau do"],
    value: "son đỏ",
    extraKeywords: ["son đỏ", "son", "red"],
  },
  {
    keys: ["son", "lipstick", "moi"],
    value: "son",
    extraKeywords: ["son", "lipstick", "môi"],
  },
  {
    keys: ["eyeliner", "eye liner", "ke mat", "but ke mat", "chi ke mat", "ke mat nuoc"],
    value: "eyeliner",
    extraKeywords: ["eyeliner", "kẻ mắt", "bút kẻ mắt", "chì kẻ mắt", "kẻ mắt nước"],
  },
  {
    keys: ["mascara", "chuot mi", "mascara chuot mi"],
    value: "mascara",
    extraKeywords: ["mascara", "chuốt mi", "mi"],
  },
  {
    keys: ["che khuyet diem", "concealer"],
    value: "che khuyết điểm",
    extraKeywords: ["che khuyết điểm", "concealer"],
  },
  {
    keys: ["lam sach", "clean"],
    value: "làm sạch",
    extraKeywords: ["làm sạch", "cleanser", "tẩy trang", "sữa rửa mặt"],
  },
  {
    keys: ["kem nen", "foundation", "nen"],
    value: "kem nền",
    extraKeywords: ["kem nền", "foundation"],
  },
  {
    keys: ["cushion", "phan nuoc"],
    value: "cushion",
    extraKeywords: ["cushion", "phấn nước"],
  },
  {
    keys: ["chong nang", "kem chong nang", "sunscreen", "uv"],
    value: "chống nắng",
    extraKeywords: ["chống nắng", "sunscreen", "uv"],
  },
  {
    keys: ["tay trang", "nuoc tay trang", "cleansing"],
    value: "tẩy trang",
    extraKeywords: ["tẩy trang", "cleansing", "makeup remover"],
  },
  {
    keys: ["serum", "tinh chat"],
    value: "serum",
    extraKeywords: ["serum", "tinh chất"],
  },
  {
    keys: ["sua rua mat", "rua mat", "cleanser"],
    value: "sữa rửa mặt",
    extraKeywords: ["sữa rửa mặt", "cleanser", "rửa mặt"],
  },
  {
    keys: ["mat na", "mask"],
    value: "mask",
    extraKeywords: ["mask", "mặt nạ"],
  },
  {
    keys: ["phan phu", "powder"],
    value: "phấn phủ",
    extraKeywords: ["phấn phủ", "powder"],
  },
  {
    keys: ["ma hong", "blush"],
    value: "má hồng",
    extraKeywords: ["má hồng", "blush"],
  },
];

const PRODUCT_STOP_WORDS = [
  "tu van",
  "tư vấn",
  "goi y",
  "gợi ý",
  "tim",
  "tìm",
  "san pham",
  "sản phẩm",
  "shop",
  "co",
  "có",
  "ban",
  "bán",
  "cho minh",
  "cho mình",
  "phu hop",
  "phù hợp",
  "nen dung",
  "nên dùng",
  "loai nao",
  "loại nào",
  "nao",
  "nào",
  "gi",
  "gì",
];

const getActiveFilter = () => ({
  $or: [
    { status: "active" },
    { isActive: true },
    { status: { $exists: false } },
    { isActive: { $exists: false } },
  ],
});

const getCategoryName = (category) => category?.name || category?.title || "";
const getBrandName = (brand) => brand?.name || brand?.title || "";

const makeRegexOr = (terms = []) => {
  const cleanTerms = terms
    .map((term) => term?.toString().trim())
    .filter(Boolean)
    .map(escapeRegex);

  if (!cleanTerms.length) return null;

  return new RegExp(cleanTerms.join("|"), "i");
};

const getProductKeywordInfo = (message = "") => {
  const normalized = normalizeText(message);

  const matched = PRODUCT_KEYWORD_MAP.find((item) =>
    item.keys.some((key) => normalized.includes(normalizeText(key)))
  );

  if (matched) {
    return {
      keyword: matched.value,
      terms: [matched.value, ...(matched.extraKeywords || [])],
    };
  }

  let cleaned = message;

  PRODUCT_STOP_WORDS.forEach((word) => {
    cleaned = cleaned.replace(new RegExp(escapeRegex(word), "gi"), " ");
  });

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return {
    keyword: cleaned || message.trim(),
    terms: cleaned ? [cleaned] : [message.trim()],
  };
};

const getCategories = async () => {
  if (!Category) return [];

  return Category.find(getActiveFilter()).sort({ name: 1 }).lean();
};

const getBrands = async () => {
  if (!Brand) return [];

  return Brand.find(getActiveFilter()).sort({ name: 1 }).lean();
};

const findMatchedCategory = async (message = "") => {
  const normalized = normalizeText(message);
  const categories = await getCategories();

  return (
    categories.find((category) => {
      const name = normalizeText(getCategoryName(category));
      const slug = normalizeText(category.slug || "");

      return (
        (name && normalized.includes(name)) ||
        (slug && normalized.includes(slug))
      );
    }) || null
  );
};

const findMatchedBrand = async (message = "") => {
  const normalized = normalizeText(message);
  const brands = await getBrands();

  return (
    brands.find((brand) => {
      const name = normalizeText(getBrandName(brand));
      const slug = normalizeText(brand.slug || "");

      return (
        (name && normalized.includes(name)) ||
        (slug && normalized.includes(slug))
      );
    }) || null
  );
};

const buildProductMetadata = (products = []) =>
  products.map((item) => ({
    id: item._id,
    name: item.name,
    slug: item.slug,
    image: item.images?.[0] || "",
    price: item.finalPrice || item.originalPrice,
    originalPrice: item.originalPrice || 0,
    finalPrice: item.finalPrice || item.originalPrice || 0,
    salePercent: item.salePercent || 0,
    link: buildProductLink(item),
    categoryName: item.categoryId?.name || "",
    brandName: item.brandId?.name || "",
  }));

const buildProductReply = ({ products, title }) => {
  const productLines = products
    .map((item, index) => {
      const price = formatMoney(item.finalPrice || item.originalPrice || 0);
      const brandName = item.brandId?.name ? ` · ${item.brandId.name}` : "";
      const categoryName = item.categoryId?.name ? ` · ${item.categoryId.name}` : "";

      return `${index + 1}. ${item.name}${brandName}${categoryName}\nGiá: ${price}`;
    })
    .join("\n\n");

  return `${title}\n\n${productLines}\n\nBạn có thể bấm vào thẻ sản phẩm bên dưới để xem chi tiết nhé.`;
};

const suggestProducts = async (message) => {
  const { keyword, terms } = getProductKeywordInfo(message);
  const matchedCategory = await findMatchedCategory(message);
  const matchedBrand = await findMatchedBrand(message);

  const regex = makeRegexOr([
    keyword,
    ...terms,
    matchedCategory ? getCategoryName(matchedCategory) : "",
    matchedBrand ? getBrandName(matchedBrand) : "",
  ]);

  const filter = {
    status: "active",
  };

  const andConditions = [];

  if (matchedCategory?._id) {
    andConditions.push({ categoryId: matchedCategory._id });
  }

  if (matchedBrand?._id) {
    andConditions.push({ brandId: matchedBrand._id });
  }

  if (regex) {
    andConditions.push({
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },
        { sku: regex },
      ],
    });
  }

  if (andConditions.length) {
    filter.$and = andConditions;
  }

  let products = await Product.find(filter)
    .populate("categoryId", "name slug")
    .populate("brandId", "name slug")
    .sort({ salePercent: -1, createdAt: -1 })
    .limit(6)
    .lean();

  if (!products.length && (matchedCategory?._id || matchedBrand?._id)) {
    const fallbackFilter = {
      status: "active",
      $or: [],
    };

    if (matchedCategory?._id) fallbackFilter.$or.push({ categoryId: matchedCategory._id });
    if (matchedBrand?._id) fallbackFilter.$or.push({ brandId: matchedBrand._id });

    products = await Product.find(fallbackFilter)
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .sort({ salePercent: -1, createdAt: -1 })
      .limit(6)
      .lean();
  }

  if (!products.length && regex) {
    products = await Product.find({
      status: "active",
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },
        { sku: regex },
      ],
    })
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .sort({ salePercent: -1, createdAt: -1 })
      .limit(6)
      .lean();
  }

  if (!products.length) {
    return {
      intent: "product_suggestion",
      status: "need_admin",
      reply:
        "Mình chưa tìm thấy sản phẩm thật phù hợp với từ khóa này. Bạn có thể hỏi theo tên sản phẩm, danh mục như chống nắng/kem nền/son/serum, hoặc thương hiệu. Mình cũng đã chuyển câu hỏi cho nhân viên để tư vấn kỹ hơn nhé.",
      metadata: {
        keyword,
        products: [],
      },
    };
  }

  const contextParts = [];
  if (matchedCategory) contextParts.push(`danh mục ${getCategoryName(matchedCategory)}`);
  if (matchedBrand) contextParts.push(`thương hiệu ${getBrandName(matchedBrand)}`);

  const title = contextParts.length
    ? `Mình tìm thấy một số sản phẩm phù hợp với ${contextParts.join(", ")}:`
    : `Mình gợi ý cho bạn một số sản phẩm phù hợp với “${keyword}”:`;

  return {
    intent: "product_suggestion",
    status: "bot_answered",
    reply: buildProductReply({ products, title }),
    metadata: {
      keyword,
      matchedCategory: matchedCategory
        ? {
            id: matchedCategory._id,
            name: getCategoryName(matchedCategory),
            slug: matchedCategory.slug,
            link: buildCategoryLink(matchedCategory),
          }
        : null,
      matchedBrand: matchedBrand
        ? {
            id: matchedBrand._id,
            name: getBrandName(matchedBrand),
            slug: matchedBrand.slug,
            link: buildBrandLink(matchedBrand),
          }
        : null,
      products: buildProductMetadata(products),
    },
  };
};

const listCategories = async () => {
  const categories = await getCategories();

  if (!categories.length) {
    return {
      intent: "product_suggestion",
      status: "need_admin",
      reply:
        "Mình chưa lấy được danh mục sản phẩm từ hệ thống. Bạn thử lại sau hoặc nhắn nhân viên BeautyShop hỗ trợ nhé.",
      metadata: {
        categories: [],
      },
    };
  }

  const lines = categories
    .map((category, index) => {
      const name = getCategoryName(category);
      return `${index + 1}. ${name}`;
    })
    .join("\n");

  return {
    intent: "product_suggestion",
    status: "bot_answered",
    reply: `BeautyShop hiện có các danh mục sản phẩm sau:\n\n${lines}\n\nBạn có thể bấm vào các danh mục bên dưới hoặc hỏi mình như: “gợi ý sản phẩm chống nắng”, “shop có son không”, “sản phẩm skincare cho da dầu”.`,
    metadata: {
      categories: categories.map((category) => ({
        id: category._id,
        name: getCategoryName(category),
        slug: category.slug,
        link: buildCategoryLink(category),
      })),
    },
  };
};

const listBrands = async () => {
  const brands = await getBrands();

  if (!brands.length) {
    return {
      intent: "product_suggestion",
      status: "need_admin",
      reply:
        "Mình chưa lấy được danh sách thương hiệu từ hệ thống. Bạn thử lại sau hoặc nhắn nhân viên BeautyShop hỗ trợ nhé.",
      metadata: {
        brands: [],
      },
    };
  }

  const lines = brands
    .slice(0, 12)
    .map((brand, index) => {
      const name = getBrandName(brand);
      return `${index + 1}. ${name}`;
    })
    .join("\n");

  return {
    intent: "product_suggestion",
    status: "bot_answered",
    reply: `BeautyShop hiện có một số thương hiệu sau:\n\n${lines}\n\nBạn có thể bấm vào thương hiệu bên dưới để xem sản phẩm tương ứng nhé.`,
    metadata: {
      brands: brands.slice(0, 12).map((brand) => ({
        id: brand._id,
        name: getBrandName(brand),
        slug: brand.slug,
        link: buildBrandLink(brand),
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

  const fulfillmentStatusMap = {
    pending: "Chờ xử lý",
    processing: "Chờ vận chuyển",
    shipped: "Đang giao hàng",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy",
  };

  const paymentStatusMap = {
    unpaid: "Chưa thanh toán",
    pending: "Chờ thanh toán",
    paid: "Đã thanh toán",
    failed: "Thanh toán thất bại",
    refunded: "Đã hoàn tiền",
  };

  return {
    intent: "order_lookup",
    status: "bot_answered",
    reply: `Đơn hàng ${order.orderCode} hiện đang ở trạng thái: ${
      fulfillmentStatusMap[order.fulfillmentStatus] || order.fulfillmentStatus
    }.\nTổng tiền: ${formatMoney(order.totalAmount || 0)}.\nThanh toán: ${
      paymentStatusMap[order.paymentStatus] || order.paymentStatus
    }.`,
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

      if (normalizedKeyword.includes(normalizedMessage) && normalizedMessage.length >= 4) {
        score += 1;
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

  if (normalized.includes("doi tra") || normalized.includes("hoan hang") || normalized.includes("tra hang")) {
    return "BeautyShop hỗ trợ đổi hàng trong 7 ngày và trả hàng trong 24 giờ. Điều kiện: bạn cần quay video mở hàng, sản phẩm còn nguyên seal/chưa sử dụng và liên hệ shop để được hướng dẫn xử lý.";
  }

  if (
    normalized.includes("ship") ||
    normalized.includes("van chuyen") ||
    normalized.includes("giao hang") ||
    normalized.includes("phi ship") ||
    normalized.includes("freeship") ||
    normalized.includes("mien phi van chuyen")
  ) {
    return "BeautyShop có chính sách miễn phí vận chuyển theo hạng thành viên: khách thường freeship từ 599.000đ, VIP từ 299.000đ và VVIP từ 99.000đ. Phí ship cụ thể sẽ được hiển thị ở bước thanh toán.";
  }

  if (
    normalized.includes("thanh toan") ||
    normalized.includes("cod") ||
    normalized.includes("chuyen khoan") ||
    normalized.includes("momo") ||
    normalized.includes("vnpay")
  ) {
    return "BeautyShop hiện hỗ trợ thanh toán COD. Nếu shop bật thêm chuyển khoản/MoMo/VNPay, hướng dẫn thanh toán sẽ hiển thị sau khi bạn tạo đơn.";
  }

  if (normalized.includes("dang nhap") || normalized.includes("tai khoan")) {
    return "Bạn nên đăng nhập để đặt hàng, lưu địa chỉ, theo dõi đơn hàng, tích lũy chi tiêu và nhận quyền lợi theo hạng thành viên.";
  }

  return null;
};

const hasCategoryIntent = (normalized = "") =>
  normalized.includes("danh muc") ||
  normalized.includes("category") ||
  normalized.includes("loai san pham") ||
  normalized.includes("nhom san pham") ||
  normalized.includes("shop co nhung san pham gi") ||
  normalized.includes("ban nhung gi") ||
  normalized.includes("co nhung gi");

const hasBrandIntent = (normalized = "") =>
  normalized.includes("thuong hieu") ||
  normalized.includes("brand") ||
  normalized.includes("hang nao") ||
  normalized.includes("nhan hang");

const hasOrderIntent = (normalized = "", text = "") =>
  normalized.includes("don hang") ||
  normalized.includes("ma don") ||
  normalized.includes("theo doi don") ||
  /ORD\d{8}\d{4}/i.test(text);

const hasProductIntent = (normalized = "") => {
  const productWords = [
    "goi y",
    "tu van",
    "san pham",
    "tim",
    "co ban",
    "shop co",
    "da dau",
    "da kho",
    "nhay cam",
    "mụn",
    "mun",
    "son",
    "kem nen",
    "eyeliner",
    "eye liner",
    "ke mat",
    "but ke mat",
    "chi ke mat",
    "mascara",
    "chuot mi",
    "che khuyet diem",
    "concealer",
    "cushion",
    "chong nang",
    "tay trang",
    "serum",
    "sua rua mat",
    "skincare",
    "mask",
    "mat na",
    "phan phu",
    "ma hong",
    "duong am",
    "cap am",
    "kiem dau",
  ];

  return productWords.some((word) => normalized.includes(normalizeText(word)));
};

/**
 * Lấy context cho Gemini AI (categories, brands, top products)
 */
const getContextForAI = async () => {
  try {
    const [categories, brands, topProducts] = await Promise.all([
      getCategories(),
      getBrands(),
      Product.find({ status: "active" })
        .select("name description categoryId brandId finalPrice originalPrice")
        .populate("categoryId", "name")
        .populate("brandId", "name")
        .limit(10)
        .lean(),
    ]);

    return {
      categories: categories || [],
      brands: brands || [],
      products: topProducts || [],
    };
  } catch (error) {
    console.error("[Error getting context for AI]:", error);
    return { categories: [], brands: [], products: [] };
  }
};

/**
 * Gọi Gemini AI khi không tìm thấy câu trả lời từ knowledge base
 */
const getAIResponse = async (message) => {
  try {
    if (!geminiService.isAvailable()) {
      return null;
    }

    const context = await getContextForAI();
    const aiResult = await geminiService.generateResponseWithRetry(message, context);

    if (!aiResult.success) {
      return null;
    }

    return {
      intent: "ai_general",
      status: "ai_answered",
      reply: aiResult.reply,
      metadata: {
        aiProvider: aiResult.aiProvider,
        model: aiResult.model,
      },
    };
  } catch (error) {
    console.error("[Error in getAIResponse]:", error);
    return null;
  }
};

const hasDirectCatalogMatch = async (message = "") => {
  const [matchedCategory, matchedBrand] = await Promise.all([
    findMatchedCategory(message),
    findMatchedBrand(message),
  ]);

  return Boolean(matchedCategory || matchedBrand);
};

const handleChat = async ({ userId = null, sessionId = null, message }) => {
  const text = message?.trim();

  if (!text) {
    throw new Error("Vui lòng nhập nội dung tin nhắn");
  }

  const normalized = normalizeText(text);
  let result;

  const policyReply = getPolicyReply(text);

  if (hasOrderIntent(normalized, text)) {
    result = await lookupOrder({ userId, message: text });
  } else if (hasCategoryIntent(normalized)) {
    result = await listCategories();
  } else if (hasBrandIntent(normalized)) {
    result = await listBrands();
  } else if (hasProductIntent(normalized) || (await hasDirectCatalogMatch(text))) {
    result = await suggestProducts(text);
  } else if (policyReply) {
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
      // Thử gọi Gemini AI khi không tìm thấy knowledge reply
      const aiResponse = await getAIResponse(text);

      if (aiResponse) {
        result = aiResponse;
      } else {
        // Fallback: yêu cầu admin hỗ trợ
        result = {
          intent: "general",
          status: "need_admin",
          reply:
            "Mình chưa chắc câu trả lời chính xác. Bạn có thể hỏi mình theo các mẫu như: \"shop có danh mục gì?\", \"gợi ý kem chống nắng\", \"sản phẩm cho da dầu\", \"tra cứu đơn ORD...\", hoặc nhân viên BeautyShop sẽ hỗ trợ bạn sớm nhất nhé.",
          metadata: {},
        };
      }
    }
  }

  result.reply = stripRawInternalLinks(result.reply);

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
