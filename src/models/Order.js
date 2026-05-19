const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
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
  },
  { _id: true }
);

orderItemSchema.pre("validate", function () {
  const unitPrice = Number(this.finalPrice ?? this.price) || 0;
  this.price = unitPrice;
  this.lineTotal = unitPrice * this.qty;
});

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    ward: {
      type: String,
      default: "",
      trim: true,
    },

    district: {
      type: String,
      default: "",
      trim: true,
    },

    province: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    customerSnapshot: {
      type: customerSnapshotSchema,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      default: [],
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    shippingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo", "vnpay"],
      required: true,
      default: "cod",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },

    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.methods.recalculateTotals = function () {
  let subtotal = 0;

  for (const item of this.items) {
    const unitPrice = Number(item.finalPrice ?? item.price) || 0;
    item.price = unitPrice;
    item.lineTotal = unitPrice * item.qty;
    subtotal += item.lineTotal;
  }

  this.subtotal = subtotal;

  const shippingFee = Number(this.shippingFee) || 0;
  const discountAmount = Number(this.discountAmount) || 0;
  const totalAmount = subtotal + shippingFee - discountAmount;

  this.totalAmount = totalAmount < 0 ? 0 : totalAmount;
};

orderSchema.pre("validate", function () {
  this.recalculateTotals();
});

orderSchema.pre("save", function () {
  this.recalculateTotals();
});

module.exports = mongoose.model("Order", orderSchema);