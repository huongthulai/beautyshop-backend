const { OAuth2Client } = require("google-auth-library");

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID chưa được cấu hình trong biến môi trường");
  }

  return new OAuth2Client(clientId);
};

const verifyGoogleIdToken = async (credential) => {
  if (!credential) {
    throw new Error("Thiếu Google credential");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const client = getGoogleClient();

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error("Không lấy được email từ tài khoản Google");
  }

  if (!payload.email_verified) {
    throw new Error("Email Google chưa được xác minh");
  }

  return {
    googleId: payload.sub,
    email: String(payload.email || "").toLowerCase().trim(),
    name: payload.name || String(payload.email || "").split("@")[0],
    avatar: payload.picture || "",
    emailVerified: Boolean(payload.email_verified),
  };
};

module.exports = {
  verifyGoogleIdToken,
};
