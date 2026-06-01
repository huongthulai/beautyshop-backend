const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_BASE_URL =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

const isAvailable = () => Boolean(process.env.GEMINI_API_KEY);

const cleanText = (text = "") =>
  text
    .toString()
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const formatProductContext = (products = []) => {
  if (!products.length) return "Chưa có dữ liệu sản phẩm nổi bật.";

  return products
    .slice(0, 10)
    .map((product, index) => {
      const price = Number(product.finalPrice || product.originalPrice || 0).toLocaleString(
        "vi-VN"
      );
      const categoryName = product.categoryId?.name || "Chưa phân loại";
      const brandName = product.brandId?.name || "Chưa có thương hiệu";

      return `${index + 1}. ${product.name} | Giá: ${price}đ | Danh mục: ${categoryName} | Thương hiệu: ${brandName}`;
    })
    .join("\n");
};

const formatNameList = (items = []) => {
  if (!items.length) return "Chưa có dữ liệu.";
  return items
    .slice(0, 20)
    .map((item) => item.name || item.title || item.slug)
    .filter(Boolean)
    .join(", ");
};

const buildPrompt = (message, context = {}) => {
  const categoriesText = formatNameList(context.categories || []);
  const brandsText = formatNameList(context.brands || []);
  const productsText = formatProductContext(context.products || []);

  return `
Bạn là BeautyChat, trợ lý mua sắm thân thiện của website mỹ phẩm BeautyShop.

NGUYÊN TẮC TRẢ LỜI:
- Trả lời bằng tiếng Việt, giọng tự nhiên, ngắn gọn, dễ hiểu.
- Chỉ tư vấn trong phạm vi mỹ phẩm, chăm sóc da, mua hàng, thanh toán, vận chuyển, đổi trả của BeautyShop.
- Không bịa chính sách. Nếu không chắc, hãy nói khách liên hệ nhân viên BeautyShop.
- Không tự tạo link nội bộ kiểu /products/... trong câu trả lời.
- Không chẩn đoán bệnh da liễu. Với vấn đề da nghiêm trọng, khuyên khách hỏi bác sĩ/ chuyên gia da liễu.
- Nếu hỏi sản phẩm cụ thể mà dữ liệu dưới đây không đủ, hãy gợi ý khách nhắn rõ loại da, nhu cầu hoặc thương hiệu.

THÔNG TIN SHOP:
- BeautyShop bán mỹ phẩm chính hãng, đặt hàng online qua website.
- Thanh toán: COD và VietQR qua payOS.
- Freeship: khách thường từ 599.000đ, VIP từ 299.000đ, VVIP từ 99.000đ.
- Đổi hàng trong 7 ngày, trả hàng trong 24 giờ nếu có video mở hàng, sản phẩm còn nguyên seal/chưa sử dụng.

DANH MỤC HIỆN CÓ:
${categoriesText}

THƯƠNG HIỆU HIỆN CÓ:
${brandsText}

MỘT SỐ SẢN PHẨM THAM KHẢO:
${productsText}

CÂU HỎI CỦA KHÁCH:
${message}

Hãy trả lời trực tiếp cho khách.`;
};

const extractReplyFromGemini = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
};

const generateResponse = async (message, context = {}) => {
  if (!isAvailable()) {
    return {
      success: false,
      reply: "",
      error: "GEMINI_API_KEY chưa được cấu hình",
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `${API_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(
    process.env.GEMINI_API_KEY
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(message, context) }],
        },
      ],
      generationConfig: {
        temperature: 0.45,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 700,
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      success: false,
      reply: "",
      error:
        data?.error?.message ||
        `Gemini API lỗi ${response.status}: ${response.statusText}`,
    };
  }

  const reply = cleanText(extractReplyFromGemini(data));

  if (!reply) {
    return {
      success: false,
      reply: "",
      error: "Gemini không trả về nội dung phù hợp",
    };
  }

  return {
    success: true,
    reply,
    aiProvider: "gemini",
    model,
  };
};

const generateResponseWithRetry = async (message, context = {}, retryCount = 1) => {
  let lastResult = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const result = await generateResponse(message, context);
      lastResult = result;

      if (result.success) return result;
    } catch (error) {
      lastResult = {
        success: false,
        reply: "",
        error: error.message,
      };
    }

    if (attempt < retryCount) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return lastResult || {
    success: false,
    reply: "",
    error: "Không gọi được Gemini",
  };
};

module.exports = {
  isAvailable,
  generateResponse,
  generateResponseWithRetry,
};
