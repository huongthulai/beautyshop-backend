const bcrypt = require("bcryptjs");
const User = require("../models/User");

const getMyProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
};

const updateMyProfile = async (userId, payload) => {
  const { name, email, phone } = payload;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (email && email.trim().toLowerCase() !== user.email) {
    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingEmail) {
      throw new Error("Email đã được sử dụng");
    }

    user.email = email.trim().toLowerCase();
  }

  if (name !== undefined) {
    user.name = name.trim();
  }

  if (phone !== undefined) {
    user.phone = phone.trim();
  }

  await user.save();

  return await User.findById(userId).select("-passwordHash");
};

const changeMyPassword = async (userId, payload) => {
  const { currentPassword, newPassword } = payload;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new Error("Mật khẩu mới không được trùng mật khẩu cũ");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;

  await user.save();

  return {
    message: "Đổi mật khẩu thành công",
  };
};

const getUsers = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 20, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.role) {
    filter.role = query.role;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { phone: { $regex: keyword, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const createUser = async (payload = {}) => {
  const {
    name,
    email,
    password,
    phone = "",
    role = "customer",
    status = "active",
    membershipTier = "regular",
  } = payload;

  if (!name?.trim()) {
    throw new Error("Tên người dùng là bắt buộc");
  }

  if (!email?.trim()) {
    throw new Error("Email là bắt buộc");
  }

  if (!password || password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new Error("Email đã được sử dụng");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    phone: phone?.trim() || "",
    role,
    status,
    membershipTier,
  });

  return await User.findById(user._id).select("-passwordHash");
};

const updateUser = async (userId, payload = {}) => {
  const {
    name,
    email,
    phone,
    role,
    status,
    membershipTier,
    password,
  } = payload;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (email && email.trim().toLowerCase() !== user.email) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    });

    if (existingEmail) {
      throw new Error("Email đã được sử dụng");
    }

    user.email = normalizedEmail;
  }

  if (name !== undefined) {
    if (!name.trim()) throw new Error("Tên người dùng là bắt buộc");
    user.name = name.trim();
  }

  if (phone !== undefined) {
    user.phone = phone.trim();
  }

  if (role !== undefined) {
    user.role = role;
  }

  if (status !== undefined) {
    user.status = status;
  }

  if (membershipTier !== undefined) {
    user.membershipTier = membershipTier;
  }

  if (password !== undefined && password !== "") {
    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();

  return await User.findById(userId).select("-passwordHash");
};

const deleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  await user.deleteOne();

  return {
    deleted: true,
  };
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