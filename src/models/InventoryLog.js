const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["in", "out", "adjust"],
      required: true,
      index: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    before: {
      type: Number,
      required: true,
      min: 0,
    },
    after: {
      type: Number,
      required: true,
      min: 0,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    ref: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.InventoryLog ||
  mongoose.model("InventoryLog", inventoryLogSchema);