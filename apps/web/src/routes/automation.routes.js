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

router.post(
  "/",
  requireAuth,
  automationController.createAutomation,
);

router.put(
  "/:id",
  requireAuth,
  automationController.updateAutomation,
);

router.delete(
  "/:id",
  requireAuth,
  automationController.deleteAutomation,
);

router.patch(
  "/:id/status",
  requireAuth,
  automationController.toggleAutomation,
);

module.exports = router;