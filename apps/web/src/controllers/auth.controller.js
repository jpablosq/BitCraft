const bcrypt = require("bcryptjs");
const authService = require("../services/auth.service");
const { createToken } = require("../utils/token");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, correo y contraseña son obligatorios",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "El nombre debe tener al menos 2 caracteres",
      });
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "El correo electrónico no es válido",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 8 caracteres",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await authService.registerUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      user: {
        id: user.p_user_id,
        createdAt: user.p_created_at,
      },
    });
  } catch (error) {
    if (
      error.code === "23505" ||
      error.message === "EMAIL_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una cuenta con ese correo",
      });
    }

    console.error("Error al registrar usuario:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible registrar el usuario",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Correo y contraseña son obligatorios",
      });
    }

    const user = await authService.loginUser(
      email.trim().toLowerCase(),
    );

    if (!user?.p_user_id || !user.p_is_active) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos",
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.p_password_hash,
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Correo o contraseña incorrectos",
      });
    }

    const token = createToken(user.p_user_id);

    res.cookie(
      process.env.COOKIE_NAME || "bitcraft_token",
      token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto",
      user: {
        id: user.p_user_id,
        name: user.p_name,
        email: user.p_email_result,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    return res.status(500).json({
      success: false,
      message: "No fue posible iniciar sesión",
    });
  }
}

module.exports = {
  register,
  login,
};