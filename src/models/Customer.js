const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    phone: { type: String, trim: true, index: true },

    status: { type: String, enum: ["active", "blocked"], default: "active", index: true },
    vip: { type: Boolean, default: false, index: true },

    note: { type: String, default: "" },
    lastActiveAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", email: "text", phone: "text" });

module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);