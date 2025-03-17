// backend/services/ouraService.js
const axios = require('axios');
const config = require('../config');
const { SleepData, ActivityData, ReadinessData } = require('../models/OuraDataModel');

/**
 * Base Oura API client for making requests to the Oura API v2
 * @see https://cloud.ouraring.com/v2/docs
 */
class OuraApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.ouraring.com/v2/usercollection';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make a request to the Oura API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - API response
   */
  async makeRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        headers: this.headers,
        params
      });
      return response.data;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Get date range parameters for API requests
   * @param {number} days - Number of days to fetch (default: 30)
   * @returns {Object} - start_date and end_date parameters
   */
  getDateRange(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Fetch sleep data from the Oura API
   * @param {number} days - Number of days to fetch
   * @returns {Promise<Object>} - Sleep data
   */
  async fetchSleepData(days = 30) {
    const params = this.getDateRange(days);
    return this.makeRequest('sleep', params);
  }

  /**
   * Fetch daily sleep data from the Oura API (for sleep scores)
   * @param {number} days - Number of days to fetch
   * @returns {Promise<Object>} - Daily sleep data with sleep scores
   */
  async fetchDailySleepData(days = 30) {
    const params = this.getDateRange(days);
    return this.makeRequest('daily_sleep', params);
  }

  /**
   * Fetch activity data from the Oura API
   * @param {number} days - Number of days to fetch
   * @returns {Promise<Object>} - Activity data
   */
  async fetchActivityData(days = 30) {
    const params = this.getDateRange(days);
    return this.makeRequest('daily_activity', params);
  }

  /**
   * Fetch readiness data from the Oura API
   * @param {number} days - Number of days to fetch
   * @returns {Promise<Object>} - Readiness data
   */
  async fetchReadinessData(days = 30) {
    const params = this.getDateRange(days);
    return this.makeRequest('daily_readiness', params);
  }
}

/**
 * Fetch all types of data from the Oura API
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Object>} - All data types
 */
exports.fetchLatestOuraData = async (days = 30) => {
  try {
    const client = new OuraApiClient(config.ouraApiKey);
    
    // Fetch all data types in parallel
    const [sleepData, dailySleepData, activityData, readinessData] = await Promise.all([
      client.fetchSleepData(days),
      client.fetchDailySleepData(days),
      client.fetchActivityData(days),
      client.fetchReadinessData(days)
    ]);
    
    return {
      sleep: sleepData,
      dailySleep: dailySleepData,
      activity: activityData,
      readiness: readinessData
    };
  } catch (error) {
    console.error('Error fetching Oura data:', error);
    throw error;
  }
};

/**
 * Store sleep data in the database
 * @param {Object} data - Sleep data from Oura API
 * @param {Object} dailySleepData - Daily sleep data with sleep scores
 * @returns {Promise<Array>} - Saved records
 */
async function storeSleepData(data, dailySleepData) {
  if (!data || !data.data) {
    console.warn('No sleep data to store');
    return [];
  }

  const savedRecords = [];
  
  // Create a map of daily sleep scores by date for quick lookup
  const sleepScoresByDate = {};
  if (dailySleepData && dailySleepData.data) {
    for (const dailySleep of dailySleepData.data) {
      sleepScoresByDate[dailySleep.day] = dailySleep.score;
    }
  }
  
  for (const sleep of data.data) {
    // Get the sleep score from the daily sleep data if available
    const sleepScore = sleepScoresByDate[sleep.day] || null;
    
    if (sleepScore) {
      console.log(`Found sleep score ${sleepScore} for date ${sleep.day}`);
    } else {
      console.log(`No sleep score found for date ${sleep.day}`);
    }
    
    // Create a data object with relevant sleep metrics
    const sleepRecord = {
      id: sleep.id,
      day: new Date(sleep.day),
      bedtime_start: sleep.bedtime_start,
      bedtime_end: sleep.bedtime_end,
      sleep_score: sleepScore, // Use the sleep score from daily sleep data
      total_sleep_duration: sleep.total_sleep_duration,
      deep_sleep_duration: sleep.deep_sleep_duration,
      rem_sleep_duration: sleep.rem_sleep_duration,
      light_sleep_duration: sleep.light_sleep_duration,
      awake_time: sleep.awake_time,
      latency: sleep.latency,
      efficiency: sleep.efficiency,
      restless_periods: sleep.restless_periods,
      average_heart_rate: sleep.average_heart_rate,
      lowest_heart_rate: sleep.lowest_heart_rate,
      average_hrv: sleep.average_hrv,
      temperature_deviation: sleep.temperature_deviation,
      readiness: sleep.readiness,
      heart_rate: sleep.heart_rate,
      hrv: sleep.hrv,
      raw_data: sleep // Store the complete raw data
    };
    
    // Find and update or create a new record
    const savedRecord = await SleepData.findOneAndUpdate(
      { id: sleep.id },
      sleepRecord,
      { new: true, upsert: true }
    );
    
    savedRecords.push(savedRecord);
  }
  
  return savedRecords;
}

/**
 * Store activity data in the database
 * @param {Object} data - Activity data from Oura API
 * @returns {Promise<Array>} - Saved records
 */
async function storeActivityData(data) {
  if (!data || !data.data) {
    console.warn('No activity data to store');
    return [];
  }

  const savedRecords = [];
  
  for (const activity of data.data) {
    // Create a data object with relevant activity metrics
    const activityRecord = {
      id: activity.id,
      day: new Date(activity.day),
      active_calories: activity.active_calories,
      average_met_minutes: activity.average_met_minutes,
      equivalent_walking_distance: activity.equivalent_walking_distance,
      high_activity_met_minutes: activity.high_activity_met_minutes,
      high_activity_time: activity.high_activity_time,
      inactivity_alerts: activity.inactivity_alerts,
      low_activity_met_minutes: activity.low_activity_met_minutes,
      low_activity_time: activity.low_activity_time,
      medium_activity_met_minutes: activity.medium_activity_met_minutes,
      medium_activity_time: activity.medium_activity_time,
      meters_to_target: activity.meters_to_target,
      non_wear_time: activity.non_wear_time,
      resting_time: activity.resting_time,
      sedentary_met_minutes: activity.sedentary_met_minutes,
      sedentary_time: activity.sedentary_time,
      steps: activity.steps,
      target_calories: activity.target_calories,
      target_meters: activity.target_meters,
      total_calories: activity.total_calories,
      activity_score: activity.score,
      raw_data: activity // Store the complete raw data
    };
    
    // Find and update or create a new record
    const savedRecord = await ActivityData.findOneAndUpdate(
      { id: activity.id },
      activityRecord,
      { new: true, upsert: true }
    );
    
    savedRecords.push(savedRecord);
  }
  
  return savedRecords;
}

/**
 * Store readiness data in the database
 * @param {Object} data - Readiness data from Oura API
 * @returns {Promise<Array>} - Saved records
 */
async function storeReadinessData(data) {
  if (!data || !data.data) {
    console.warn('No readiness data to store');
    return [];
  }

  const savedRecords = [];
  
  for (const readiness of data.data) {
    // Create a data object with relevant readiness metrics
    const readinessRecord = {
      id: readiness.id,
      day: new Date(readiness.day),
      score: readiness.score,
      activity_balance: readiness.contributors?.activity_balance,
      body_temperature: readiness.contributors?.body_temperature,
      hrv_balance: readiness.contributors?.hrv_balance,
      previous_day_activity: readiness.contributors?.previous_day_activity,
      previous_night: readiness.contributors?.previous_night,
      recovery_index: readiness.contributors?.recovery_index,
      resting_heart_rate: readiness.contributors?.resting_heart_rate,
      sleep_balance: readiness.contributors?.sleep_balance,
      temperature_deviation: readiness.temperature_deviation,
      temperature_trend_deviation: readiness.temperature_trend_deviation,
      raw_data: readiness // Store the complete raw data
    };
    
    // Find and update or create a new record
    const savedRecord = await ReadinessData.findOneAndUpdate(
      { id: readiness.id },
      readinessRecord,
      { new: true, upsert: true }
    );
    
    savedRecords.push(savedRecord);
  }
  
  return savedRecords;
}

/**
 * Store all types of Oura data in the database
 * @param {Object} data - All data types from Oura API
 * @returns {Promise<Object>} - Saved records for each data type
 */
exports.storeData = async (data) => {
  try {
    if (!data) {
      throw new Error('No data provided to store');
    }

    // Store each data type in parallel
    const [sleepRecords, activityRecords, readinessRecords] = await Promise.all([
      storeSleepData(data.sleep, data.dailySleep),
      storeActivityData(data.activity),
      storeReadinessData(data.readiness)
    ]);
    
    return {
      sleep: sleepRecords,
      activity: activityRecords,
      readiness: readinessRecords,
      totalCount: sleepRecords.length + activityRecords.length + readinessRecords.length
    };
  } catch (error) {
    console.error('Error storing Oura data:', error);
    throw error;
  }
};

/**
 * Fetch data for a specific query type and time range
 * @param {string} queryType - Type of query (sleep, activity, readiness)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Data for the query
 */
exports.fetchDataForQuery = async (queryType, startDate, endDate, limit = 100) => {
  try {
    let data = [];
    
    // Set default date range if not provided
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Default to last 7 days instead of 30
    }
    
    if (!endDate) {
      endDate = new Date();
    }
    
    // Query the appropriate model based on query type
    switch (queryType) {
      case 'sleep':
        data = await SleepData.find({
          day: { $gte: startDate, $lte: endDate }
        }).sort({ day: -1 }).limit(limit).lean();
        break;
      case 'activity':
        data = await ActivityData.find({
          day: { $gte: startDate, $lte: endDate }
        }).sort({ day: -1 }).limit(limit).lean();
        break;
      case 'readiness':
        data = await ReadinessData.find({
          day: { $gte: startDate, $lte: endDate }
        }).sort({ day: -1 }).limit(limit).lean();
        break;
      case 'general':
      case 'recommendation':
        // For general queries, fetch all data types but limit each
        const [sleepData, activityData, readinessData] = await Promise.all([
          SleepData.find({
            day: { $gte: startDate, $lte: endDate }
          }).sort({ day: -1 }).limit(limit).lean(),
          ActivityData.find({
            day: { $gte: startDate, $lte: endDate }
          }).sort({ day: -1 }).limit(limit).lean(),
          ReadinessData.find({
            day: { $gte: startDate, $lte: endDate }
          }).sort({ day: -1 }).limit(limit).lean()
        ]);
        
        data = {
          sleep: sleepData,
          activity: activityData,
          readiness: readinessData
        };
        break;
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for query type ${queryType}:`, error);
    throw error;
  }
};

/**
 * Get the most recent date for which we have data
 * @returns {Promise<string|null>} - The most recent date in ISO format, or null if no data
 */
exports.getMostRecentDataDate = async () => {
  try {
    // Try to get the most recent sleep data
    const mostRecentSleep = await SleepData.findOne().sort({ day: -1 }).lean();
    
    if (mostRecentSleep && mostRecentSleep.day) {
      return mostRecentSleep.day;
    }
    
    // If no sleep data, try activity data
    const mostRecentActivity = await ActivityData.findOne().sort({ day: -1 }).lean();
    
    if (mostRecentActivity && mostRecentActivity.day) {
      return mostRecentActivity.day;
    }
    
    // If no activity data, try readiness data
    const mostRecentReadiness = await ReadinessData.findOne().sort({ day: -1 }).lean();
    
    if (mostRecentReadiness && mostRecentReadiness.day) {
      return mostRecentReadiness.day;
    }
    
    // No data found
    return null;
  } catch (error) {
    console.error('Error getting most recent data date:', error);
    return null;
  }
};