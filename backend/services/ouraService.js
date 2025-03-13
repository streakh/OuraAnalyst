// backend/services/ouraService.js
const axios = require('axios');
const config = require('../config');
const OuraDataModel = require('../models/OuraDataModel');

exports.fetchLatestOuraData = async () => {
  try {
    // Calculate dates for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    // Format dates as YYYY-MM-DD
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const response = await axios.get('https://api.ouraring.com/v2/usercollection/sleep', {
        params: {
            start_date: formattedStartDate,
            end_date: formattedEndDate
        },
        headers: {
          'Authorization': `Bearer ${config.ouraApiKey}`
        }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Oura data:', error);
    throw error;
  }
};

// Store Oura sleep data in the database
exports.storeData = async (data) => {
  try {
    if (!data || !data.data) {
      throw new Error('Invalid data format received from Oura API');
    }

    const sleepData = data.data;
    
    // Process and store each sleep record
    const savedRecords = [];
    for (const sleep of sleepData) {
      // Extract the date from the sleep record
      const date = new Date(sleep.day);
      
      // Create a data object with relevant sleep metrics
      const sleepRecord = {
        date: date,
        sleepScore: sleep.sleep_score,
        // Add additional fields from the Oura API response as needed
        workoutData: sleep
      };
      
      // Find and update or create a new record
      const savedRecord = await OuraDataModel.findOneAndUpdate(
        { date: date },
        sleepRecord,
        { new: true, upsert: true }
      );
      
      savedRecords.push(savedRecord);
    }
    
    return savedRecords;
  } catch (error) {
    console.error('Error storing Oura data:', error);
    throw error;
  }
};