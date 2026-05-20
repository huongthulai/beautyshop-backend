const chatbotService = require("../services/chatbot.service");

const getUserId = (req) => req.user?.id || req.user?._id || null;

const sendMessage = async (req, res) => {
  try {
    const result = await chatbotService.handleChat({
      userId: getUserId(req),
      sessionId: req.body.sessionId,
      message: req.body.message,
    });

    return res.json({
      success: true,
      message: "Chatbot phản hồi thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Chatbot không thể xử lý yêu cầu",
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const data = await chatbotService.getChatHistory(req.query);

    return res.json({
      success: true,
      message: "Lấy lịch sử chat thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được lịch sử chat",
    });
  }
};

const getUserChatHistory = async (req, res) => {
  try {
    const data = await chatbotService.getUserChatHistory({
      userId: getUserId(req),
      sessionId: req.query.sessionId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.json({
      success: true,
      message: "Lấy lịch sử chat của khách thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được lịch sử chat của khách",
    });
  }
};

const replyChatMessage = async (req, res) => {
  try {
    const data = await chatbotService.replyChatMessage({
      messageId: req.params.messageId,
      adminId: getUserId(req),
      reply: req.body.reply,
    });

    return res.json({
      success: true,
      message: "Gửi câu trả lời cho khách hàng thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không gửi được câu trả lời",
    });
  }
};

const createKnowledge = async (req, res) => {
  try {
    const data = await chatbotService.createKnowledge(req.body);

    return res.status(201).json({
      success: true,
      message: "Thêm kiến thức chatbot thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không thêm được kiến thức chatbot",
    });
  }
};

const getKnowledgeList = async (req, res) => {
  try {
    const data = await chatbotService.getKnowledgeList(req.query);

    return res.json({
      success: true,
      message: "Lấy danh sách kiến thức chatbot thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được kiến thức chatbot",
    });
  }
};

const updateKnowledge = async (req, res) => {
  try {
    const data = await chatbotService.updateKnowledge(
      req.params.knowledgeId,
      req.body
    );

    return res.json({
      success: true,
      message: "Cập nhật kiến thức chatbot thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không cập nhật được kiến thức chatbot",
    });
  }
};

const deleteKnowledge = async (req, res) => {
  try {
    const data = await chatbotService.deleteKnowledge(req.params.knowledgeId);

    return res.json({
      success: true,
      message: "Xóa kiến thức chatbot thành công",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không xóa được kiến thức chatbot",
    });
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  getUserChatHistory,
  replyChatMessage,
  createKnowledge,
  getKnowledgeList,
  updateKnowledge,
  deleteKnowledge,
};
