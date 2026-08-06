const db = require("../config/db");

const {
  enqueueAutomationExecution,
} = require("./automation.service");


async function getMatchingAutomations(
  repository,
) {
  const { rows } = await db.query(
    `
      CALL public.sp_get_github_issue_automations(
        $1::varchar,
        NULL::jsonb
      )
    `,
    [repository],
  );

  return rows[0]?.p_automations ?? [];
}


async function processIssueCreatedWebhook({
  deliveryId,
  repository,
  payload,
}) {
  const automations =
    await getMatchingAutomations(
      repository,
    );

  const executions = [];

  for (const automation of automations) {
    const idempotencyKey =
      `github-${deliveryId}-${automation.id}`;

    const execution =
      await enqueueAutomationExecution({
        automationId:
          automation.id,

        userId:
          automation.userId,

        idempotencyKey,

        inputData:
          payload,
      });

    executions.push({
      automationId:
        automation.id,

      executionId:
        execution.executionId,

      created:
        execution.created,
    });
  }

  return {
    matched:
      automations.length,

    executions,
  };
}


module.exports = {
  getMatchingAutomations,
  processIssueCreatedWebhook,
};