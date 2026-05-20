const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    salePercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    volumeWeight: {
      type: String,
      trim: true,
      default: "",
    },

    color: {
      type: String,
      trim: true,
      default: "",
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isSelected: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { _id: true }
);

cartItemSchema.pre("validate", function () {
  const unitPrice = Number(this.finalPrice ?? this.price) || 0;
  this.price = unitPrice;
  this.lineTotal = unitPrice * this.qty;
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    totalQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    selectedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    selectedTotalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.methods.recalculateTotals = function () {
  let totalQty = 0;
  let totalPrice = 0;
  let selectedQty = 0;
  let selectedTotalPrice = 0;

  for (const item of this.items) {
    const unitPrice = Number(item.finalPrice ?? item.price) || 0;
    item.price = unitPrice;
    item.lineTotal = unitPrice * item.qty;

    totalQty += item.qty;
    totalPrice += item.lineTotal;

    if (item.isSelected) {
      selectedQty += item.qty;
      selectedTotalPrice += item.lineTotal;
    }
  }

  this.totalQty = totalQty;
  this.totalPrice = totalPrice;
  this.selectedQty = selectedQty;
  this.selectedTotalPrice = selectedTotalPrice;
};

cartSchema.pre("validate", function () {
  this.recalculateTotals();
});

cartSchema.pre("save", function () {
  this.recalculateTotals();
});

module.exports = mongoose.model("Cart", cartSchema);