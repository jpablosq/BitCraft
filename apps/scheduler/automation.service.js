const pool = require("./database");

const automationQueue = require(
  "./automation.queue",
);

async function getActiveScheduledAutomations() {
  const { rows } = await pool.query(
    `
      CALL public.sp_get_active_scheduled_automations(
        NULL::jsonb
      )
    `,
  );

  return rows[0]?.p_automations ?? [];
}

async function enqueueScheduledAutomation({
  automationId,
  userId,
  scheduledAt,
}) {
  const scheduledDate =
    scheduledAt instanceof Date
      ? scheduledAt
      : new Date(scheduledAt);

  if (
    Number.isNaN(
      scheduledDate.getTime(),
    )
  ) {
    throw new Error(
      "INVALID_SCHEDULED_DATE",
    );
  }

  const scheduledAtIso =
    scheduledDate.toISOString();

  const idempotencyKey =
    `schedule-${automationId}-${scheduledAtIso}`;

  const inputData = {
    source: "schedule",
    scheduledAt: scheduledAtIso,
  };

  const { rows } = await pool.query(
    `
      CALL public.sp_create_automation_execution(
        $1::bigint,
        $2::bigint,
        $3::varchar,
        $4::jsonb,
        NULL::bigint,
        NULL::boolean
      )
    `,
    [
      automationId,
      userId,
      idempotencyKey,
      JSON.stringify(inputData),
    ],
  );

  const executionId =
    rows[0]?.p_execution_id;

  const created =
    rows[0]?.p_created ?? false;

  if (!executionId) {
    throw new Error(
      "SCHEDULE_EXECUTION_NOT_CREATED",
    );
  }

  if (created) {
    await automationQueue.add(
      "execute-automation",
      {
        executionId,
        automationId,
        userId,
        inputData,
      },
      {
        jobId:
          `automation-execution-${executionId}`,
      },
    );
  }

  return {
    executionId,
    created,
  };
}

module.exports = {
  getActiveScheduledAutomations,
  enqueueScheduledAutomation,
};