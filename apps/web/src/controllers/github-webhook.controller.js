const crypto = require("node:crypto");

const githubWebhookService = require(
  "../services/github-webhook.service",
);


function isValidSignature({
  rawBody,
  signature,
  secret,
}) {
  if (
    !Buffer.isBuffer(rawBody) ||
    !signature ||
    !secret
  ) {
    return false;
  }

  const expectedSignature =
    `sha256=${
      crypto
        .createHmac(
          "sha256",
          secret,
        )
        .update(rawBody)
        .digest("hex")
    }`;

  const receivedBuffer =
    Buffer.from(
      signature,
      "utf8",
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8",
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}


async function receiveGithubWebhook(
  req,
  res,
) {
  try {
    const webhookSecret =
      process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "[GitHub Webhook] GITHUB_WEBHOOK_SECRET no está configurado.",
      );

      return res.status(500).json({
        success: false,
        message:
          "El webhook no está configurado.",
      });
    }

    const signature = String(
      req.get("X-Hub-Signature-256") ||
      "",
    ).trim();

    const validSignature =
      isValidSignature({
        rawBody:
          req.rawBody,

        signature,

        secret:
          webhookSecret,
      });

    if (!validSignature) {
      console.warn(
        "[GitHub Webhook] Firma inválida.",
      );

      return res.status(401).json({
        success: false,
        message:
          "La firma del webhook no es válida.",
      });
    }

    const eventName = String(
      req.get("X-GitHub-Event") ||
      "",
    ).trim();

    const deliveryId = String(
      req.get("X-GitHub-Delivery") ||
      "",
    ).trim();

    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message:
          "Falta el identificador de la entrega.",
      });
    }

    if (eventName === "ping") {
      return res.status(200).json({
        success: true,
        message:
          "Webhook de GitHub conectado correctamente.",
      });
    }

    if (
      eventName !== "issues" ||
      req.body?.action !== "opened"
    ) {
      return res.status(200).json({
        success: true,
        ignored: true,
        message:
          "El evento no requiere procesamiento.",
      });
    }

    const repository = String(
      req.body?.repository?.full_name ||
      "",
    ).trim();

    if (!repository) {
      return res.status(400).json({
        success: false,
        message:
          "El repositorio no está presente en el evento.",
      });
    }

    const result =
      await githubWebhookService
        .processIssueCreatedWebhook({
          deliveryId,
          repository,
          payload:
            req.body,
        });

    console.log(
      `[GitHub Webhook] Entrega ${deliveryId} procesada.`,
      {
        repository,
        matched:
          result.matched,
      },
    );

    return res.status(202).json({
      success: true,
      message:
        "Evento recibido y enviado para procesamiento.",
      matched:
        result.matched,
      executions:
        result.executions,
    });
  } catch (error) {
    console.error(
      "[GitHub Webhook] Error procesando evento:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo procesar el webhook.",
    });
  }
}


module.exports = {
  receiveGithubWebhook,
};