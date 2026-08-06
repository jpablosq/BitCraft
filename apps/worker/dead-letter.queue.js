const path = require("node:path");
const { Queue } = require("bullmq");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: 1,
};

const deadLetterQueue = new Queue(
  "automation-execution-dlq",
  {
    connection,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
    },
  },
);

module.exports = deadLetterQueue;