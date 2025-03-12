// backend/services/ouraService.js
const axios = require('axios');
const config = require('../config');

exports.fetchLatestOuraData = async () => {
  try {
    const response = await axios.get('https://api.ouraring.com/v2/usercollection/sleep', {
        params: {
            // Adjust these dates as needed or make them dynamic
            start_date: '2025-01-01',
            end_date: '2025-12-31'
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

// Placeholder for storeData (implement as needed)
exports.storeData = async (data) => {
  // Save or update data in your database here.
};