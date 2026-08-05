const express = require("express");

const automationController = require(
  "../controllers/automation.controller",
);

const {
  requireAuth,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  automationController.getAutomations,
);

router.get(
  "/executions",
  requireAuth,
  automationController.getAutomationExecutions,
);

router.post(
  "/",
  requireAuth,
  automationController.createAutomation,
);

router.post(
  "/:id/execute",
  requireAuth,
  automationController.executeAutomation,
);

router.put(
  "/:id",
  requireAuth,
  automationController.updateAutomation,
);

router.patch(
  "/:id/status",
  requireAuth,
  automationController.toggleAutomation,
);

router.delete(
  "/:id",
  requireAuth,
  automationController.deleteAutomation,
);

module.exports = router;