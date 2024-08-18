export default {
  crawler: {
    delay: Number(process.env.CRALWER_DELAY) || 1000 * 60 * 30,
    factor: Number(process.env.CRALWER_FACTOR) || 3,
    random_percentage: Number(process.env.CRALWER_RANDOM_PERCENTAGE) || 10,
    max_attempts: Number(process.env.CRALWER_MAX_ATTEMPTS) || 5,
  },
};
