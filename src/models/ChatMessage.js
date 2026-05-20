const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    userMessage: {
      type: String,
      required: true,
      trim: true,
    },
    botReply: {
      type: String,
      required: true,
      trim: true,
    },
    adminReply: {
      type: String,
      default: "",
      trim: true,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["bot_answered", "need_admin", "admin_answered"],
      default: "bot_answered",
      index: true,
    },
    intent: {
      type: String,
      enum: ["order_lookup", "product_suggestion", "policy", "general"],
      default: "general",
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);
