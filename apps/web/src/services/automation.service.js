const db = require("../config/db");

async function getAutomations(userId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "CALL public.sp_get_automations($1,$2)",
      [userId, "automations_cursor"],
    );

    const result = await client.query(
      "FETCH ALL FROM automations_cursor",
    );

    await client.query("COMMIT");

    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createAutomation({
  userId,
  name,
  triggerProvider,
  triggerEvent,
  actionProvider,
  actionName,
  configuration,
}) {
  await db.query(
    `
      CALL public.sp_create_automation(
        $1,$2,$3,$4,$5,$6,$7
      )
    `,
    [
      userId,
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
    ],
  );
}

async function updateAutomation({
  id,
  userId,
  name,
  triggerProvider,
  triggerEvent,
  actionProvider,
  actionName,
  configuration,
  isActive,
}) {
  await db.query(
    `
      CALL public.sp_update_automation(
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
    `,
    [
      id,
      userId,
      name,
      triggerProvider,
      triggerEvent,
      actionProvider,
      actionName,
      configuration,
      isActive,
    ],
  );
}

async function deleteAutomation(id, userId) {
  await db.query(
    `
      CALL public.sp_delete_automation($1,$2)
    `,
    [
      id,
      userId,
    ],
  );
}

async function toggleAutomation(
  id,
  userId,
  status,
) {
  await db.query(
    `
      CALL public.sp_toggle_automation(
        $1,$2,$3
      )
    `,
    [
      id,
      userId,
      status,
    ],
  );
}

module.exports = {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
};