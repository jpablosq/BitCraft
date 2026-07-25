const jwt = require("jsonwebtoken");

function createToken(userId) {
    return jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
        subject: String(userId),
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        issuer: "bitcraft-api",
        audience: "bitcraft-frontend",
    },
  );
}

module.exports = {
    createToken,
};