const { verifyToken } = require("../utils/token");

function requireAuth(req, res, next) {
  const cookieName = process.env.COOKIE_NAME || "bitcraft_token";

  const token = req.cookies?.[cookieName];

  if (!token) {
    return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión",
    });
  }

  try {
    const payload = verifyToken(token);

    req.userId = payload.sub;

    return next();
  } catch (error) {
    return res.status(401).json({
        success: false,
        message: "La sesión no es válida o ha expirado",
    });
  }
}

module.exports = {
    requireAuth,
};