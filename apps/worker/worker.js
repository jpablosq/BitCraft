const path = require("node:path");
const { Worker } = require("bullmq");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
};

const automationWorker = new Worker(
  "automation-execution",

  async (job) => {
    console.log(
      `[Worker] Procesando trabajo ${job.id}`,
      {
        name: job.name,
        automationId: job.data?.automationId,
        userId: job.data?.userId,
      },
    );

    // Más adelante aquí se ejecutarán las acciones reales
    // de Google y GitHub.

    return {
      processed: true,
      processedAt: new Date().toISOString(),
    };
  },

  {
    connection,
    concurrency: 1,
  },
);

automationWorker.on(
  "ready",
  () => {
    console.log(
      "[Worker] Conectado a Redis y esperando trabajos.",
    );
  },
);

automationWorker.on(
  "completed",
  (job, result) => {
    console.log(
      `[Worker] Trabajo ${job.id} completado.`,
      result,
    );
  },
);

automationWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `[Worker] Trabajo ${job?.id} falló:`,
      error.message,
    );
  },
);

automationWorker.on(
  "error",
  (error) => {
    console.error(
      "[Worker] Error de conexión:",
      error.message,
    );
  },
);

async function shutdown(signal) {
  console.log(
    `[Worker] Cerrando por señal ${signal}...`,
  );

  await automationWorker.close();

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