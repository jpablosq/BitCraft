const path = require("node:path");
const { Queue } = require("bullmq");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

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