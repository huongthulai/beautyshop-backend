const authService = require("../services/auth.service");

const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // validate required
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ name, email, password",
      });
    }

    // validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng",
      });
    }

    // validate phone (10 số)
    const phoneRegex = /^[0-9]{10}$/;
    if (phone && !phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại phải gồm đúng 10 chữ số",
      });
    }

    // validate password
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
  me,
};