const { Queue } = require("bullmq");

const automationQueue = new Queue(
  "automation-execution",
  {
    connection: {
      host:
        process.env.REDIS_HOST ||
        "127.0.0.1",

      port: Number(
        process.env.REDIS_PORT || 6379,
      ),

      // El endpoint falla rápido si Redis no responde.
      maxRetriesPerRequest: 1,
    },

    defaultJobOptions: {
      attempts: 3,

      backoff: {
        type: "exponential",
        delay: 2000,
      },

      removeOnComplete: 100,
      removeOnFail: false,
    },
  },
);

module.exports = automationQueue;