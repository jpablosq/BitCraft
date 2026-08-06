const path = require("node:path");
const { Worker } = require("bullmq");

const pool = require("./database");

const {
  getAutomationForExecution,
} = require("./automation.service");

const {
  executeAutomationActions,
} = require("./action.executor");

const {
  evaluateConditions,
} = require("./condition.evaluator");

const deadLetterQueue = require(
  "./dead-letter.queue",
);

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connection = {
  host:
    process.env.REDIS_HOST ||
    "127.0.0.1",

  port: Number(
    process.env.REDIS_PORT || 6379,
  ),
};

async function updateExecutionStatus({
  executionId,
  userId,
  status,
  outputData = null,
  errorMessage = null,
}) {
  await pool.query(
    `
      CALL public.sp_update_automation_execution_status(
        $1,
        $2,
        $3,
        $4::jsonb,
        $5,
        NULL
      )
    `,
    [
      executionId,
      userId,
      status,

      outputData
        ? JSON.stringify(outputData)
        : null,

      errorMessage,
    ],
  );
}

const automationWorker = new Worker(
  "automation-execution",

  async (job) => {
    const {
      executionId,
      automationId,
      userId,
      inputData = {},
    } = job.data || {};

    if (
      !executionId ||
      !automationId ||
      !userId
    ) {
      throw new Error(
        "El trabajo no contiene executionId, automationId o userId.",
      );
    }

    console.log(
      `[Worker] Procesando trabajo ${job.id}`,
      {
        executionId,
        automationId,
        userId,
        attempt:
          job.attemptsMade + 1,
      },
    );

    try {
      await updateExecutionStatus({
        executionId,
        userId,
        status: "processing",
      });

      const automation =
        await getAutomationForExecution(
          automationId,
          userId,
        );

      if (!automation) {
        throw new Error(
          "AUTOMATION_NOT_FOUND_OR_INACTIVE",
        );
      }

      if (
        !Array.isArray(
          automation.actions,
        ) ||
        automation.actions.length === 0
      ) {
        throw new Error(
          "AUTOMATION_WITHOUT_ACTIONS",
        );
      }

      console.log(
        `[Worker] Automatización encontrada: ${automation.name}`,
        {
          triggerType:
            automation.triggerType,

          actions:
            automation.actions.length,
        },
      );

      const conditionEvaluation =
        evaluateConditions({
          conditions:
            automation.conditions || [],

          inputData,
        });

      console.log(
        "[Worker] Resultado de condiciones:",
        {
          passed:
            conditionEvaluation.passed,

          total:
            conditionEvaluation
              .results.length,
        },
      );

      if (!conditionEvaluation.passed) {
        const result = {
          processed: true,
          skipped: true,

          reason:
            "CONDITIONS_NOT_MET",

          automationId,

          automationName:
            automation.name,

          actionCount: 0,

          conditions:
            conditionEvaluation.results,

          processedAt:
            new Date().toISOString(),
        };

        await updateExecutionStatus({
          executionId,
          userId,
          status: "success",
          outputData: result,
        });

        return result;
      }

      const actionResults =
        await executeAutomationActions({
          automation,
          userId,
          inputData,
        });

      const result = {
        processed: true,
        automationId,

        automationName:
          automation.name,

        actionCount:
          actionResults.length,

        actions:
          actionResults,

        processedAt:
          new Date().toISOString(),
      };

      await updateExecutionStatus({
        executionId,
        userId,
        status: "success",
        outputData: result,
      });

      return result;
    } catch (error) {
      try {
        await updateExecutionStatus({
          executionId,
          userId,
          status: "failed",

          errorMessage:
            error.message,
        });
      } catch (databaseError) {
        console.error(
          "[Worker] No se pudo guardar el error en PostgreSQL:",
          databaseError.message,
        );
      }

      throw error;
    }
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
  async (job, error) => {
    console.error(
      `[Worker] Trabajo ${job?.id} falló:`,
      error.message,
    );

    if (!job) {
      return;
    }

    const maximumAttempts =
      Number(
        job.opts.attempts || 1,
      );

    const attemptsFinished =
      job.attemptsMade >=
      maximumAttempts;

    if (!attemptsFinished) {
      console.log(
        `[Worker] El trabajo ${job.id} será reintentado.`,
      );

      return;
    }

    try {
      await deadLetterQueue.add(
        "failed-automation-execution",

        {
          originalJobId:
            job.id,

          executionId:
            job.data?.executionId,

          automationId:
            job.data?.automationId,

          userId:
            job.data?.userId,

          inputData:
            job.data?.inputData ?? {},

          errorMessage:
            error.message,

          attempts:
            job.attemptsMade,

          failedAt:
            new Date().toISOString(),
        },

        {
          jobId:
            `dlq-${job.id}`,
        },
      );

      console.log(
        `[Worker] Trabajo ${job.id} enviado a la DLQ.`,
      );
    } catch (dlqError) {
      console.error(
        `[Worker] No se pudo enviar el trabajo ${job.id} a la DLQ:`,
        dlqError.message,
      );
    }
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
  await deadLetterQueue.close();
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