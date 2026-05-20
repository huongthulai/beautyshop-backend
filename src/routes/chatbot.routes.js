const express = require("express");
const chatbotController = require("../controllers/chatbot.controller");
const { verifyToken, requireRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  return verifyToken(req, res, next);
};

router.post("/message", optionalAuth, chatbotController.sendMessage);
router.get("/user-history", optionalAuth, chatbotController.getUserChatHistory);

router.get(
  "/history",
  verifyToken,
  requireRoles("admin", "staff"),
  chatbotController.getChatHistory
);

router.post(
  "/history/:messageId/reply",
  verifyToken,
  requireRoles("admin", "staff"),
  chatbotController.replyChatMessage
);

module.exports = router;
