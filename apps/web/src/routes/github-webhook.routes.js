const express = require("express");

const githubWebhookController = require(
  "../controllers/github-webhook.controller",
);

const router = express.Router();

router.post(
  "/",
  githubWebhookController.receiveGithubWebhook,
);

module.exports = router;