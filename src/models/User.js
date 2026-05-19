const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "staff", "customer"],
      default: "customer",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
      index: true,
    },
    totalSpent: {
  type: Number,
  default: 0,
  min: 0,
},

membershipTier: {
  type: String,
  enum: ["regular", "vip", "vvip"],
  default: "regular",
},
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);