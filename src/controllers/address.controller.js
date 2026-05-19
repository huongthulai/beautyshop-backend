const addressService = require("../services/address.service");

const getMyAddresses = async (req, res) => {
  try {
    const addresses = await addressService.getAddressesByUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách địa chỉ thành công",
      data: addresses,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được địa chỉ",
    });
  }
};

const getAddress = async (req, res) => {
  try {
    const address = await addressService.getAddressById(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Lấy địa chỉ thành công",
      data: address,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Không tìm thấy địa chỉ",
    });
  }
};

const createAddress = async (req, res) => {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo địa chỉ thành công",
      data: address,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Tạo địa chỉ thất bại",
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const address = await addressService.updateAddress(
      req.user.id,
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật địa chỉ thành công",
      data: address,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Cập nhật địa chỉ thất bại",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await addressService.deleteAddress(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Xóa địa chỉ thành công",
      data: address,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Xóa địa chỉ thất bại",
    });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const address = await addressService.setDefaultAddress(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật địa chỉ mặc định thành công",
      data: address,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Cập nhật địa chỉ mặc định thất bại",
    });
  }
};

module.exports = {
  getMyAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
