const Address = require("../models/Address");

const getAddressesByUser = async (userId) => {
  return Address.find({ userId, status: "active" })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean();
};

const getAddressById = async (userId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    userId,
    status: "active",
  });

  if (!address) {
    throw new Error("Không tìm thấy địa chỉ");
  }

  return address;
};

const createAddress = async (userId, payload) => {
  const {
    fullName,
    phone,
    addressLine,
    ward = "",
    district = "",
    province = "",
    note = "",
    isDefault = false,
  } = payload;

  if (isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  const address = await Address.create({
    userId,
    fullName,
    phone,
    addressLine,
    ward,
    district,
    province,
    note,
    isDefault,
    status: "active",
  });

  return address;
};

const updateAddress = async (userId, addressId, payload) => {
  const address = await Address.findOne({
    _id: addressId,
    userId,
    status: "active",
  });

  if (!address) {
    throw new Error("Không tìm thấy địa chỉ");
  }

  if (payload.isDefault) {
    await Address.updateMany({ userId }, { isDefault: false });
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] !== undefined) {
      address[key] = payload[key];
    }
  });

  await address.save();
  return address;
};

const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    userId,
    status: "active",
  });

  if (!address) {
    throw new Error("Không tìm thấy địa chỉ");
  }

  address.status = "inactive";
  address.isDefault = false;
  await address.save();

  return address;
};

const setDefaultAddress = async (userId, addressId) => {
  const address = await Address.findOne({
    _id: addressId,
    userId,
    status: "active",
  });

  if (!address) {
    throw new Error("Không tìm thấy địa chỉ");
  }

  await Address.updateMany({ userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  return address;
};

module.exports = {
  getAddressesByUser,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
