const express = require("express");

const connectionController = require(
  "../controllers/connection.controller",
);

const {
  requireAuth,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  connectionController.getConnections,
);

router.get(
  "/google",
  requireAuth,
  connectionController.connectGoogle,
);

router.get(
  "/google/callback",
  requireAuth,
  connectionController.googleCallback,
);

router.delete(
  "/:provider",
  requireAuth,
  connectionController.revokeConnection,
);

module.exports = router;