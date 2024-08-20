export default {
  crawler: {
    delay: Number(process.env.CRALWER_DELAY) || 1000 * 60 * 30,
    backoff_factor: Number(process.env.CRALWER_BACKOFF_FACTOR) || 4,
    backoff_random_percentage:
      Number(process.env.CRALWER_BACKOFF_RANDOM_PERCENTAGE) || 10,
    max_attempts: Number(process.env.CRALWER_MAX_ATTEMPTS) || 10,
    schedule_size: Number(process.env.CRALWER_SCHEDULE_SIZE) || 10,
  },
  alert: {
    schedule_size: Number(process.env.ALERT_SCHEDULE_SIZE) || 10,
  },
  limits: {
    max_watch_items: Number(process.env.LIMITS_MAX_WATCH_ITEMS) || 10,
  },
};
