const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");
const User = require("../models/User");
const { verifyGoogleIdToken } = require("../services/googleAuth.service");

const buildUserResponse = (user) => {
  const plainUser = typeof user.toObject === "function" ? user.toObject() : user;

  delete plainUser.passwordHash;
  delete plainUser.__v;

  return plainUser;
};

const signAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET chưa được cấu hình");
  }

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ name, email, password",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng",
      });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (phone && !phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại phải gồm đúng 10 chữ số",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    const result = await authService.register({
      name,
      email,
      password,
      phone,
    });

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Đăng ký thất bại",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và password",
      });
    }

    const result = await authService.login({ email, password });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Đăng nhập thất bại",
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    const googleUser = await verifyGoogleIdToken(credential);

    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        passwordHash: "",
        googleId: googleUser.googleId,
        authProvider: "google",
        avatar: googleUser.avatar,
        phone: "",
        role: "customer",
        status: "active",
        membershipTier: "regular",
        totalSpent: 0,
      });
    } else {
      user.googleId = user.googleId || googleUser.googleId;
      user.avatar = user.avatar || googleUser.avatar;

      // Không đổi authProvider của tài khoản local cũ để người dùng vẫn đăng nhập được bằng mật khẩu.
      if (!user.authProvider) {
        user.authProvider = "local";
      }

      await user.save();
    }

    if (user.status === "blocked" || user.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa hoặc ngừng hoạt động",
      });
    }

    const accessToken = signAccessToken(user);
    const safeUser = buildUserResponse(user);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập Google thành công",
      data: {
        access_token: accessToken,
        token: accessToken,
        user: safeUser,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Đăng nhập Google thất bại",
    });
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin thành công",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Không lấy được thông tin người dùng",
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  me,
};
