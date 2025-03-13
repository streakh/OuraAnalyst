const mongoose = require('mongoose');

const connectDatabase = async (dbURI) => {
  try {
    await mongoose.connect(dbURI);
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection error', err);
    process.exit(1);
  }
};

module.exports = { connectDatabase };