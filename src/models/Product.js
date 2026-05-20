const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
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
      default: 0,
      index: true,
    },

    saleStartAt: {
      type: Date,
      default: null,
    },

    saleEndAt: {
      type: Date,
      default: null,
    },

    images: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    volumeWeightOptions: {
      type: [String],
      default: [],
    },

    colorOptions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "active", "out_of_stock", "inactive", "archived"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: "text", description: "text", sku: "text" });

productSchema.methods.isSaleActive = function () {
  const now = new Date();

  if (!this.salePercent || this.salePercent <= 0) {
    return false;
  }

  if (this.saleStartAt && now < this.saleStartAt) {
    return false;
  }

  if (this.saleEndAt && now > this.saleEndAt) {
    return false;
  }

  return true;
};

productSchema.methods.calculateFinalPrice = function () {
  const basePrice = Number(this.originalPrice) || 0;
  const salePercent = Number(this.salePercent) || 0;

  if (!this.isSaleActive()) {
    return basePrice;
  }

  const discounted = Math.round(basePrice * (1 - salePercent / 100));
  return discounted < 0 ? 0 : discounted;
};

productSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  if (
    this.saleStartAt &&
    this.saleEndAt &&
    this.saleStartAt.getTime() > this.saleEndAt.getTime()
  ) {
    throw new Error("saleEndAt phải lớn hơn hoặc bằng saleStartAt");
  }

  this.finalPrice = this.calculateFinalPrice();
});

productSchema.pre("save", function () {
  this.finalPrice = this.calculateFinalPrice();
});

module.exports = mongoose.model("Product", productSchema);