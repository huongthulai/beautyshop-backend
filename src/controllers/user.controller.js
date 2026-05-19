const userService = require("../services/user.service");

const getMyProfile = async (req, res) => {
  try {
    const user = await userService.getMyProfile(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin tài khoản thành công",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Không lấy được thông tin tài khoản",
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await userService.updateMyProfile(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin tài khoản thành công",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Cập nhật thông tin tài khoản thất bại",
    });
  }
};

const changeMyPassword = async (req, res) => {
  try {
    const result = await userService.changeMyPassword(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Đổi mật khẩu thất bại",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await userService.getUsers(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách người dùng thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Không lấy được danh sách người dùng",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Tạo người dùng thất bại",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Cập nhật người dùng thành công",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Cập nhật người dùng thất bại",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Xóa người dùng thất bại",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};