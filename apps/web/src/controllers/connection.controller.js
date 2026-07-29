const crypto = require("node:crypto");

const GoogleAdapter = require(
  "../../../../packages/providers/GoogleAdapter",
);

const connectionService = require(
  "../services/connection.service",
);

const {
  encryptToken,
} = require("../utils/tokenEncryption");

function createGoogleAdapter() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "Faltan las variables de entorno de Google OAuth",
    );
  }

  return new GoogleAdapter({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  });
}

async function getConnections(req, res) {
  try {
    const connections =
      await connectionService.getConnections(
        req.userId,
      );

    return res.status(200).json({
      success: true,
      connections,
    });
  } catch (error) {
    console.error(
      "Error al obtener las conexiones:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible obtener las conexiones",
    });
  }
}

function connectGoogle(req, res) {
  try {
    const state = crypto
      .randomBytes(32)
      .toString("hex");

    res.cookie(
      "google_oauth_state",
      state,
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/api/connections/google",
        maxAge: 10 * 60 * 1000,
      },
    );

    const googleAdapter =
      createGoogleAdapter();

    const authorizationUrl =
      googleAdapter.getAuthorizationUrl(
        state,
      );

    return res.redirect(
      authorizationUrl,
    );
  } catch (error) {
    console.error(
      "Error al iniciar la conexión con Google:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible iniciar la conexión con Google",
    });
  }
}

async function googleCallback(req, res) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "http://localhost:5173";

  try {
    const {
      code,
      state,
      error: googleError,
    } = req.query;

    const savedState =
      req.cookies?.google_oauth_state;

    res.clearCookie(
      "google_oauth_state",
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/api/connections/google",
      },
    );

    if (
      !state ||
      !savedState ||
      state !== savedState
    ) {
      return res.redirect(
        `${frontendUrl}/connectors?google=invalid_state`,
      );
    }

    if (googleError) {
      return res.redirect(
        `${frontendUrl}/connectors?google=cancelled`,
      );
    }

    if (!code) {
      return res.redirect(
        `${frontendUrl}/connectors?google=missing_code`,
      );
    }

    const googleAdapter =
      createGoogleAdapter();

    const tokens =
      await googleAdapter.exchangeCode(code);

    if (!tokens.accessToken) {
      throw new Error(
        "Google no devolvió un access token",
      );
    }

    const profile =
      await googleAdapter.getAccountProfile(
        tokens.accessToken,
      );

    if (!profile.providerAccountId) {
      throw new Error(
        "Google no devolvió el identificador de la cuenta",
      );
    }

    await connectionService.saveConnection({
      userId: req.userId,
      provider: "google",

      providerAccountId:
        profile.providerAccountId,

      accountName:
        profile.accountName,

      accountEmail:
        profile.accountEmail,

      accessTokenEncrypted:
        encryptToken(
          tokens.accessToken,
        ),

      refreshTokenEncrypted:
        encryptToken(
          tokens.refreshToken,
        ),

      tokenExpiresAt:
        tokens.expiresAt,

      scopes:
        tokens.scopes,
    });

    return res.redirect(
      `${frontendUrl}/connectors?google=connected`,
    );
  } catch (error) {
    console.error(
      "Error en el callback de Google:",
      error,
    );

    return res.redirect(
      `${frontendUrl}/connectors?google=error`,
    );
  }
}

async function revokeConnection(req, res) {
  try {
    const { provider } = req.params;

    const allowedProviders = ["google", "github"];

    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Proveedor no válido.",
      });
    }

    const revoked = await connectionService.revokeConnection(
      req.userId,
      provider,
    );

    if (!revoked) {
      return res.status(404).json({
        success: false,
        message: "No se encontró una conexión activa.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `La conexión con ${provider} fue revocada correctamente.`,
    });
  } catch (error) {
    console.error("Error al revocar conexión:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo revocar la conexión.",
    });
  }
}

module.exports = {
  getConnections,
  connectGoogle,
  googleCallback,
  revokeConnection,
};