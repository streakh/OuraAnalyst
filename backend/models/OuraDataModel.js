const mongoose = require('mongoose');

// Schema for Sleep data
const sleepSchema = new mongoose.Schema({
  id: String,
  day: { type: Date, required: true },
  bedtime_start: String,
  bedtime_end: String,
  sleep_score: Number,
  total_sleep_duration: Number,
  deep_sleep_duration: Number,
  rem_sleep_duration: Number,
  light_sleep_duration: Number,
  awake_time: Number,
  latency: Number,
  efficiency: Number,
  restless_periods: Number,
  average_heart_rate: Number,
  lowest_heart_rate: Number,
  average_hrv: Number,
  temperature_deviation: Number,
  readiness: Object,
  heart_rate: Object,
  hrv: Object,
  raw_data: Object // Store the complete raw data for future use
});

// Schema for Activity data
const activitySchema = new mongoose.Schema({
  id: String,
  day: { type: Date, required: true },
  active_calories: Number,
  average_met_minutes: Number,
  equivalent_walking_distance: Number,
  high_activity_met_minutes: Number,
  high_activity_time: Number,
  inactivity_alerts: Number,
  low_activity_met_minutes: Number,
  low_activity_time: Number,
  medium_activity_met_minutes: Number,
  medium_activity_time: Number,
  meters_to_target: Number,
  non_wear_time: Number,
  resting_time: Number,
  sedentary_met_minutes: Number,
  sedentary_time: Number,
  steps: Number,
  target_calories: Number,
  target_meters: Number,
  total_calories: Number,
  activity_score: Number,
  raw_data: Object // Store the complete raw data for future use
});

// Schema for Readiness data
const readinessSchema = new mongoose.Schema({
  id: String,
  day: { type: Date, required: true },
  score: Number,
  activity_balance: Number,
  body_temperature: Number,
  hrv_balance: Number,
  previous_day_activity: Number,
  previous_night: Number,
  recovery_index: Number,
  resting_heart_rate: Number,
  sleep_balance: Number,
  temperature_deviation: Number,
  temperature_trend_deviation: Number,
  raw_data: Object // Store the complete raw data for future use
});

// Create models from the schemas
const SleepData = mongoose.model('SleepData', sleepSchema);
const ActivityData = mongoose.model('ActivityData', activitySchema);
const ReadinessData = mongoose.model('ReadinessData', readinessSchema);

module.exports = {
  SleepData,
  ActivityData,
  ReadinessData
};