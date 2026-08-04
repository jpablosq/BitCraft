const automationService = require(
  "../services/automation.service",
);

function getAutomationId(req) {
  const automationId = Number(req.params.id);

  if (
    !Number.isInteger(automationId) ||
    automationId <= 0
  ) {
    return null;
  }

  return automationId;
}

function validateAutomationBody(body) {
  const {
    name,
    triggerType,
    triggerProvider,
    triggerEvent,
    triggerConfiguration,
    conditions,
    actions,
  } = body;

  if (!name || !String(name).trim()) {
    return "El nombre es obligatorio.";
  }

  if (!triggerType) {
    return "El tipo de disparador es obligatorio.";
  }

  if (!triggerProvider) {
    return "El proveedor del disparador es obligatorio.";
  }

  if (!triggerEvent) {
    return "El evento del disparador es obligatorio.";
  }

  if (
    triggerConfiguration !== undefined &&
    (
      typeof triggerConfiguration !== "object" ||
      Array.isArray(triggerConfiguration)
    )
  ) {
    return "La configuración del disparador no es válida.";
  }

  if (
    conditions !== undefined &&
    !Array.isArray(conditions)
  ) {
    return "Las condiciones deben ser un arreglo.";
  }

  if (
    !Array.isArray(actions) ||
    actions.length === 0
  ) {
    return "Debe agregar al menos una acción.";
  }

  return null;
}

function handleControllerError(error, res) {
  console.error(
    "Error en automatizaciones:",
    error,
  );

  if (error.code === "22023") {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Los datos de la automatización no son válidos.",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "Ocurrió un error al procesar la automatización.",
  });
}

async function getAutomations(req, res) {
  try {
    const automations =
      await automationService.getAutomations(
        req.userId,
      );

    return res.status(200).json({
      success: true,
      automations,
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

async function createAutomation(req, res) {
  try {
    const validationError =
      validateAutomationBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      triggerConfiguration = {},
      conditions = [],
      actions,
    } = req.body;

    const automationId =
      await automationService.createAutomation({
        userId: req.userId,
        name,
        triggerType,
        triggerProvider,
        triggerEvent,
        triggerConfiguration,
        conditions,
        actions,
      });

    return res.status(201).json({
      success: true,
      message:
        "Automatización creada correctamente.",
      automationId,
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

async function updateAutomation(req, res) {
  try {
    const automationId = getAutomationId(req);

    if (!automationId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la automatización no es válido.",
      });
    }

    const validationError =
      validateAutomationBody(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      triggerConfiguration = {},
      conditions = [],
      actions,
      isActive = true,
    } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "El estado de la automatización no es válido.",
      });
    }

    const updated =
      await automationService.updateAutomation({
        automationId,
        userId: req.userId,
        name,
        triggerType,
        triggerProvider,
        triggerEvent,
        triggerConfiguration,
        conditions,
        actions,
        isActive,
      });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message:
          "No se encontró la automatización.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Automatización actualizada correctamente.",
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

async function deleteAutomation(req, res) {
  try {
    const automationId = getAutomationId(req);

    if (!automationId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la automatización no es válido.",
      });
    }

    const deleted =
      await automationService.deleteAutomation(
        automationId,
        req.userId,
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "No se encontró la automatización.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Automatización eliminada correctamente.",
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

async function toggleAutomation(req, res) {
  try {
    const automationId = getAutomationId(req);

    if (!automationId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la automatización no es válido.",
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "El estado isActive debe ser verdadero o falso.",
      });
    }

    const updated =
      await automationService.toggleAutomation(
        automationId,
        req.userId,
        isActive,
      );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message:
          "No se encontró la automatización.",
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Automatización activada correctamente."
        : "Automatización desactivada correctamente.",
    });
  } catch (error) {
    return handleControllerError(error, res);
  }
}

module.exports = {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};