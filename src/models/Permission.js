const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    roleKey: {
      type: String,
      required: true,
      enum: ["admin", "staff", "customer"],
      index: true,
    },

    matrix: {
      products: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      orders: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      inventory: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      customers: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },

      users: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Permission ||
  mongoose.model("Permission", permissionSchema);