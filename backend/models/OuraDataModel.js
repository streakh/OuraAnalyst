const mongoose = require('mongoose');

const ouraDataSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  sleepScore: Number,
  activityScore: Number,
  workoutData: Object
  // Add additional fields as needed
});

module.exports = mongoose.model('OuraData', ouraDataSchema);