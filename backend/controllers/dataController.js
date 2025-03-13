// backend/controllers/dataController.js
const ouraService = require('../services/ouraService');

exports.updateOuraData = async (req, res) => {
  try {
    // Fetch the latest data from Oura API
    const data = await ouraService.fetchLatestOuraData();
    
    // Store the data in the database
    const savedRecords = await ouraService.storeData(data);
    
    res.json({ 
      message: 'Oura data updated successfully', 
      count: savedRecords.length,
      sample: savedRecords.length > 0 ? savedRecords[0] : null
    });
  } catch (error) {
    console.error('Error updating Oura data:', error);
    res.status(500).json({ 
      error: 'Error updating Oura data',
      details: error.message
    });
  }
};

exports.testOuraConnection = async (req, res) => {
  try {
    // Just fetch the data without storing it
    const data = await ouraService.fetchLatestOuraData();
    
    res.json({ 
      message: 'Oura API connection successful', 
      dataReceived: !!data,
      dataCount: data.data ? data.data.length : 0,
      sampleData: data.data && data.data.length > 0 ? data.data[0] : null
    });
  } catch (error) {
    console.error('Error testing Oura API connection:', error);
    res.status(500).json({ 
      error: 'Error connecting to Oura API',
      details: error.message
    });
  }
};