export default {
  crawler: {
    delay: Number(process.env.CRALWER_DELAY) || 1000 * 60 * 30,
    factor: Number(process.env.CRALWER_FACTOR) || 4,
    random_percentage: Number(process.env.CRALWER_RANDOM_PERCENTAGE) || 10,
    max_attempts: Number(process.env.CRALWER_MAX_ATTEMPTS) || 10,
    schedule_size: Number(process.env.CRALWER_SCHEDULE_SIZE) || 10,
  },
  alert: {
    schedule_size: Number(process.env.ALERT_SCHEDULE_SIZE) || 10,
  },
};
