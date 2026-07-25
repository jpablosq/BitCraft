const bcrypt = require("bcryptjs");
const authService = require("../services/auth.service");
const { createToken } = require("../utils/token");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

async function register(req, res) {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre, nombre de usuario, correo y contraseña son obligatorios",
      });
    }

    const normalizedName = name.trim();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "El nombre debe tener al menos 2 caracteres",
      });
    }

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre de usuario debe tener entre 3 y 50 caracteres",
      });
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos",
      });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
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
      name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      user: {
        id: user.p_user_id,
        name: normalizedName,
        username: normalizedUsername,
        email: normalizedEmail,
        avatarUrl: null,
        createdAt: user.p_created_at,
      },
    });
  } catch (error) {
    if (error.message?.includes("USERNAME_ALREADY_EXISTS")) {
      return res.status(409).json({
        success: false,
        message: "El nombre de usuario ya está en uso",
      });
    }

    if (error.message?.includes("EMAIL_ALREADY_EXISTS")) {
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
        username: user.p_username,
        email: user.p_email_result,
        avatarUrl: user.p_avatar_url,
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

async function me(req, res) {
  try {
    const user = await authService.getUserById(req.userId);

    if (!user?.p_id || !user.p_is_active) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.p_id,
        name: user.p_name,
        username: user.p_username,
        email: user.p_email,
        avatarUrl: user.p_avatar_url,
      },
    });
  } catch (error) {
    console.error(
      "Error al obtener el usuario autenticado:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "No fue posible obtener el usuario",
    });
  }
}

function logout(req, res) {
  const cookieName =
    process.env.COOKIE_NAME || "bitcraft_token";

  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Sesión cerrada correctamente",
  });
}

module.exports = {
  register,
  login,
  me,
  logout,
};