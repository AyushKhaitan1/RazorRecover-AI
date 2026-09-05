require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_AIBuilder2026',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'secret_mock_test_key_ai_builder',
  MONGO_URI: process.env.MONGO_URI || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SIMULATION_SPEED_MS: parseInt(process.env.SIMULATION_SPEED_MS || '120', 10)
};
