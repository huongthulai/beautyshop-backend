const mongoose = require("mongoose");

const chatKnowledgeSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    keywords: {
      type: [String],
      default: [],
      index: true,
    },

    answer: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "policy",
        "product_advice",
        "skin_care",
        "payment",
        "shipping",
        "order",
        "general",
      ],
      default: "general",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ChatKnowledge ||
  mongoose.model("ChatKnowledge", chatKnowledgeSchema);