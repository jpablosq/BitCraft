const db = require("../config/db");

async function createAutomation({
  userId,
  name,
  triggerType,
  triggerProvider,
  triggerEvent,
  triggerConfiguration = {},
  conditions = [],
  actions = [],
}) {
  const { rows } = await db.query(
    `
      CALL public.sp_create_automation(
        $1::bigint,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::jsonb,
        $7::jsonb,
        $8::jsonb,
        NULL::bigint
      )
    `,
    [
      userId,
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      JSON.stringify(triggerConfiguration),
      JSON.stringify(conditions),
      JSON.stringify(actions),
    ],
  );

  return rows[0]?.p_automation_id;
}

async function getAutomations(userId) {
  const { rows } = await db.query(
    `
      CALL public.sp_get_automations(
        $1::bigint,
        NULL::jsonb
      )
    `,
    [userId],
  );

  return rows[0]?.p_automations ?? [];
}

async function updateAutomation({
  automationId,
  userId,
  name,
  triggerType,
  triggerProvider,
  triggerEvent,
  triggerConfiguration = {},
  conditions = [],
  actions = [],
  isActive = true,
}) {
  const { rows } = await db.query(
    `
      CALL public.sp_update_automation(
        $1::bigint,
        $2::bigint,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::varchar,
        $7::jsonb,
        $8::jsonb,
        $9::jsonb,
        $10::boolean,
        NULL::boolean
      )
    `,
    [
      automationId,
      userId,
      name,
      triggerType,
      triggerProvider,
      triggerEvent,
      JSON.stringify(triggerConfiguration),
      JSON.stringify(conditions),
      JSON.stringify(actions),
      isActive,
    ],
  );

  return rows[0]?.p_updated ?? false;
}

async function deleteAutomation(automationId, userId) {
  const { rows } = await db.query(
    `
      CALL public.sp_delete_automation(
        $1::bigint,
        $2::bigint,
        NULL::boolean
      )
    `,
    [
      automationId,
      userId,
    ],
  );

  return rows[0]?.p_deleted ?? false;
}

async function toggleAutomation(
  automationId,
  userId,
  isActive,
) {
  const { rows } = await db.query(
    `
      CALL public.sp_toggle_automation(
        $1::bigint,
        $2::bigint,
        $3::boolean,
        NULL::boolean
      )
    `,
    [
      automationId,
      userId,
      isActive,
    ],
  );

  return rows[0]?.p_updated ?? false;
}

module.exports = {
  createAutomation,
  getAutomations,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};