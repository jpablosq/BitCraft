const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const authRoutes = require("./src/routes/auth.routes");
const connectionRoutes = require(
  "./src/routes/connection.routes",
);
const automationRoutes = require(
  "./src/routes/automation.routes",
);
const githubWebhookRoutes = require(
  "./src/routes/github-webhook.routes",
);

const app = express();

const PORT =
  process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

/*
 * Conserva el cuerpo original únicamente para
 * el webhook de GitHub. Se necesita para validar
 * correctamente la firma HMAC SHA-256.
 */
app.use(
  express.json({
    verify(req, res, buffer) {
      if (
        req.originalUrl.startsWith(
          "/api/webhooks/github",
        )
      ) {
        req.rawBody =
          Buffer.from(buffer);
      }
    },
  }),
);

app.use(cookieParser());

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "BitCraft API funcionando",
    });
  },
);

/*
 * Ruta pública del webhook.
 * No utiliza requireAuth porque GitHub
 * realiza la petición directamente.
 */
app.use(
  "/api/webhooks/github",
  githubWebhookRoutes,
);

app.use(
  "/api/auth",
  authRoutes,
);

app.use(
  "/api/connections",
  connectionRoutes,
);

app.use(
  "/api/automations",
  automationRoutes,
);

app.listen(
  PORT,
  () => {
    console.log(
      `Servidor ejecutándose en http://localhost:${PORT}`,
    );

    console.log(
      `[GitHub Webhook] Endpoint: http://localhost:${PORT}/api/webhooks/github`,
    );
  },
);