const path = require("node:path");
const cron = require("node-cron");

const pool = require("./database");

const automationQueue = require(
  "./automation.queue",
);

const {
  getActiveScheduledAutomations,
  enqueueScheduledAutomation,
} = require("./automation.service");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const TIMEZONE =
  process.env.SCHEDULER_TIMEZONE ||
  "America/Costa_Rica";

const REFRESH_INTERVAL_MS = 30_000;

const scheduledTasks = new Map();

let synchronizing = false;
let refreshInterval = null;

function normalizeScheduledDate(date = new Date()) {
  const normalizedDate = new Date(date);

  // Las expresiones configuradas en BitCraft
  // trabajan con precisión de minutos.
  normalizedDate.setSeconds(0, 0);

  return normalizedDate;
}

async function executeScheduledAutomation(
  automation,
) {
  const scheduledAt =
    normalizeScheduledDate();

  console.log(
    `[Scheduler] Activando automatización ${automation.id}: ${automation.name}`,
    {
      userId: automation.userId,
      scheduledAt:
        scheduledAt.toISOString(),
    },
  );

  try {
    const result =
      await enqueueScheduledAutomation({
        automationId:
          automation.id,

        userId:
          automation.userId,

        scheduledAt,
      });

    if (result.created) {
      console.log(
        `[Scheduler] Ejecución ${result.executionId} enviada a Redis.`,
      );

      return;
    }

    console.log(
      `[Scheduler] La ejecución ${result.executionId} ya existía.`,
    );
  } catch (error) {
    console.error(
      `[Scheduler] No se pudo activar la automatización ${automation.id}:`,
      error.message,
    );
  }
}

function destroyScheduledTask(
  automationId,
) {
  const storedTask =
    scheduledTasks.get(
      String(automationId),
    );

  if (!storedTask) {
    return;
  }

  storedTask.task.destroy();

  scheduledTasks.delete(
    String(automationId),
  );

  console.log(
    `[Scheduler] Programación eliminada para la automatización ${automationId}.`,
  );
}

function registerScheduledTask(
  automation,
) {
  const automationKey =
    String(automation.id);

  const cronExpression =
    String(
      automation.cronExpression || "",
    ).trim();

  if (!cronExpression) {
    console.warn(
      `[Scheduler] La automatización ${automation.id} no tiene expresión cron.`,
    );

    return;
  }

  const existingTask =
    scheduledTasks.get(
      automationKey,
    );

  if (
    existingTask &&
    existingTask.cronExpression ===
      cronExpression &&
    String(existingTask.userId) ===
      String(automation.userId)
  ) {
    return;
  }

  if (existingTask) {
    destroyScheduledTask(
      automation.id,
    );
  }

  try {
    const task = cron.schedule(
      cronExpression,

      () =>
        executeScheduledAutomation(
          automation,
        ),

      {
        timezone: TIMEZONE,
        noOverlap: true,
        name:
          `automation-${automation.id}`,
      },
    );

    scheduledTasks.set(
      automationKey,
      {
        task,
        cronExpression,
        userId:
          automation.userId,
      },
    );

    console.log(
      `[Scheduler] Automatización ${automation.id} registrada con cron "${cronExpression}".`,
    );
  } catch (error) {
    console.error(
      `[Scheduler] Expresión cron inválida en la automatización ${automation.id}:`,
      error.message,
    );
  }
}

async function synchronizeScheduledTasks() {
  if (synchronizing) {
    return;
  }

  synchronizing = true;

  try {
    const automations =
      await getActiveScheduledAutomations();

    const activeAutomationIds =
      new Set(
        automations.map(
          (automation) =>
            String(automation.id),
        ),
      );

    for (
      const automationId
      of scheduledTasks.keys()
    ) {
      if (
        !activeAutomationIds.has(
          automationId,
        )
      ) {
        destroyScheduledTask(
          automationId,
        );
      }
    }

    for (const automation of automations) {
      registerScheduledTask(
        automation,
      );
    }

    console.log(
      `[Scheduler] Sincronización completada. Programaciones activas: ${scheduledTasks.size}.`,
    );
  } catch (error) {
    console.error(
      "[Scheduler] No se pudieron sincronizar las automatizaciones:",
      error.message,
    );
  } finally {
    synchronizing = false;
  }
}

async function startScheduler() {
  console.log(
    `[Scheduler] Iniciando con zona horaria ${TIMEZONE}.`,
  );

  await synchronizeScheduledTasks();

  refreshInterval = setInterval(
    synchronizeScheduledTasks,
    REFRESH_INTERVAL_MS,
  );
}

async function shutdown(signal) {
  console.log(
    `[Scheduler] Cerrando por señal ${signal}...`,
  );

  if (refreshInterval) {
    clearInterval(
      refreshInterval,
    );
  }

  for (
    const automationId
    of scheduledTasks.keys()
  ) {
    destroyScheduledTask(
      automationId,
    );
  }

  await automationQueue.close();
  await pool.end();

  process.exit(0);
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT"),
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM"),
);

startScheduler().catch(
  async (error) => {
    console.error(
      "[Scheduler] Error al iniciar:",
      error,
    );

    await automationQueue.close();
    await pool.end();

    process.exit(1);
  },
);
