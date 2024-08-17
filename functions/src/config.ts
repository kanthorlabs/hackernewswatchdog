export default {
  crawler: {
    init_delay: Number(process.env.CRALWER_INIT_DELAY) || 1000 * 60 * 30,
    factor: Number(process.env.CRALWER_FACTOR) || 4,
    random_percentage: Number(process.env.CRALWER_RANDOM_PERCENTAGE) || 10,
  },
};
