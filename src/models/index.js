const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");

const Brand = require("./Brand");
const Category = require("./Category");
const Product = require("./Product");

const Inventory = require("./Inventory");
const InventoryLog = require("./InventoryLog");

const Customer = require("./Customer");
const Cart = require("./Cart");
const Order = require("./Order");
const Payment = require("./Payment");
const Wishlist = require("./Wishlist");
const Address = require("./Address");
module.exports = {
  User,
  Role,
  Permission,

  Brand,
  Category,
  Product,

  Inventory,
  InventoryLog,

  Customer,
  Cart,
  Order,
  Payment,
  Wishlist,
  Address,
};
// shop
// │
// ├── users
// ├── roles
// ├── permissions
// │
// ├── products
// ├── inventory
// ├── inventory_logs
// │
// ├── customers
// ├── orders
// ├── payments
// ├── cart