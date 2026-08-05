const pool = require("./database");

async function getAutomationForExecution(
  automationId,
  userId,
) {
  const { rows } = await pool.query(
    `
      CALL public.sp_get_automation_for_execution(
        $1::bigint,
        $2::bigint,
        NULL::jsonb
      )
    `,
    [
      automationId,
      userId,
    ],
  );

  return rows[0]?.p_automation ?? null;
}

module.exports = {
  getAutomationForExecution,
};