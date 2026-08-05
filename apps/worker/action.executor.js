const GoogleAdapter = require(
  "../../packages/providers/GoogleAdapter",
);

const GitHubAdapter = require(
  "../../packages/providers/GitHubAdapter",
);

const {
  getActiveConnection,
} = require("./connection.service");

const {
  interpolateValue,
} = require("./interpolation");

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
      "GOOGLE_CONFIGURATION_REQUIRED",
    );
  }

  return new GoogleAdapter({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  });
}

function createGitHubAdapter() {
  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI,
  } = process.env;

  if (
    !GITHUB_CLIENT_ID ||
    !GITHUB_CLIENT_SECRET ||
    !GITHUB_REDIRECT_URI
  ) {
    throw new Error(
      "GITHUB_CONFIGURATION_REQUIRED",
    );
  }

  return new GitHubAdapter({
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    redirectUri: GITHUB_REDIRECT_URI,
  });
}

function parseRepository(repository) {
  const parts = String(repository ?? "")
    .trim()
    .split("/");

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1]
  ) {
    throw new Error(
      "GITHUB_REPOSITORY_FORMAT_INVALID",
    );
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

async function executeGoogleAction({
  action,
  userId,
  configuration,
}) {
  const connection =
    await getActiveConnection(
      userId,
      "google",
    );

  if (!connection?.accessToken) {
    throw new Error(
      "GOOGLE_CONNECTION_NOT_FOUND",
    );
  }

  const adapter = createGoogleAdapter();

  if (action.actionName === "send_email") {
    return adapter.sendEmail({
      accessToken:
        connection.accessToken,

      refreshToken:
        connection.refreshToken,

      to:
        configuration.to,

      subject:
        configuration.subject,

      body:
        configuration.body,
    });
  }

  throw new Error(
    `UNSUPPORTED_GOOGLE_ACTION:${action.actionName}`,
  );
}

async function executeGitHubAction({
  action,
  userId,
  configuration,
}) {
  const connection =
    await getActiveConnection(
      userId,
      "github",
    );

  if (!connection?.accessToken) {
    throw new Error(
      "GITHUB_CONNECTION_NOT_FOUND",
    );
  }

  const adapter = createGitHubAdapter();

  const {
    owner,
    repo,
  } = parseRepository(
    configuration.repository,
  );

  if (
    action.actionName ===
    "create_issue"
  ) {
    return adapter.createIssue({
      accessToken:
        connection.accessToken,

      owner,
      repo,

      title:
        configuration.title,

      body:
        configuration.body,
    });
  }

  if (
    action.actionName ===
    "add_comment"
  ) {
    return adapter.addComment({
      accessToken:
        connection.accessToken,

      owner,
      repo,

      issueNumber:
        configuration.issueNumber,

      body:
        configuration.body,
    });
  }

  throw new Error(
    `UNSUPPORTED_GITHUB_ACTION:${action.actionName}`,
  );
}

async function executeAction({
  action,
  userId,
  context,
}) {
  const configuration =
    interpolateValue(
      action.configuration ?? {},
      context,
    );

  if (action.provider === "google") {
    return executeGoogleAction({
      action,
      userId,
      configuration,
    });
  }

  if (action.provider === "github") {
    return executeGitHubAction({
      action,
      userId,
      configuration,
    });
  }

  throw new Error(
    `UNSUPPORTED_PROVIDER:${action.provider}`,
  );
}

async function executeAutomationActions({
  automation,
  userId,
  inputData = {},
}) {
  const orderedActions = [
    ...automation.actions,
  ].sort(
    (firstAction, secondAction) =>
      firstAction.position -
      secondAction.position,
  );

  const context = {
    input: inputData,
    trigger: inputData,
    steps: {},
  };
  const results = [];

  for (const action of orderedActions) {
    console.log(
      `[Worker] Ejecutando acción ${action.position}:`,
      {
        provider: action.provider,
        actionName: action.actionName,
      },
    );

    const result = await executeAction({
      action,
      userId,
      context,
    });

    context.steps[
      String(action.position)
    ] = result;

    results.push({
      position: action.position,
      provider: action.provider,
      actionName: action.actionName,
      result,
    });
  }

  return results;
}

module.exports = {
  executeAutomationActions,
};