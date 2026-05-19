const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    mobileImage: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    buttonText: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    position: {
      type: String,
      default: "homepage_hero",
      index: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Banner || mongoose.model("Banner", bannerSchema);