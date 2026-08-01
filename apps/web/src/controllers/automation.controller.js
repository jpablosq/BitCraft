const automationService = require(
  "../services/automation.service",
);

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
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "No fue posible obtener las automatizaciones.",
    });
  }
}

async function createAutomation(req, res) {
  try {
    const {
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
    } = req.body;

    await automationService.createAutomation({
      userId: req.userId,
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
    });

    return res.status(201).json({
      success: true,
      message:
        "Automatización creada correctamente.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "No fue posible crear la automatización.",
    });
  }
}

async function updateAutomation(req, res) {
  try {
    const { id } = req.params;

    const {
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
      isActive,
    } = req.body;

    await automationService.updateAutomation({
      id,
      userId: req.userId,
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message:
        "Automatización actualizada correctamente.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "No fue posible actualizar la automatización.",
    });
  }
}

async function deleteAutomation(req, res) {
  try {
    const { id } = req.params;

    await automationService.deleteAutomation(
      id,
      req.userId,
    );

    return res.status(200).json({
      success: true,
      message:
        "Automatización eliminada correctamente.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "No fue posible eliminar la automatización.",
    });
  }
}

async function toggleAutomation(req, res) {
  try {
    const { id } = req.params;

    const { isActive } = req.body;

    await automationService.toggleAutomation(
      id,
      req.userId,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message:
        "Estado actualizado correctamente.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "No fue posible actualizar el estado.",
    });
  }
}

module.exports = {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};