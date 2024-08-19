export default {
  crawler: {
    delay: Number(process.env.CRALWER_DELAY) || 1000 * 60 * 30,
    factor: Number(process.env.CRALWER_FACTOR) || 4,
    random_percentage: Number(process.env.CRALWER_RANDOM_PERCENTAGE) || 10,
    max_attempts: Number(process.env.CRALWER_MAX_ATTEMPTS) || 10,
    concurrency: Number(process.env.CRALWER_CONCURRENCY) || 1,
  },
  alert: {
    concurrency: Number(process.env.ALERT_CONCURRENCY) || 10,
  },
};
