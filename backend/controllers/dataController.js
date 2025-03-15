const ouraService = require('../services/ouraService');

/**
 * Update Oura data by fetching the latest data from the Oura API and storing it in the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.updateOuraData = async (req, res) => {
  try {
    console.log('Updating Oura data...');
    
    // Fetch the latest data from the Oura API
    const data = await ouraService.fetchLatestOuraData();
    
    // Store the data in the database
    const result = await ouraService.storeData(data);
    
    // Return a success response
    res.json({
      message: 'Oura data updated successfully',
      count: result.totalCount,
      summary: {
        sleep: result.sleep.length,
        activity: result.activity.length,
        readiness: result.readiness.length
      },
      data: result
    });
  } catch (error) {
    console.error('Error updating Oura data:', error);
    res.status(500).json({
      error: 'Error updating Oura data',
      details: error.message
    });
  }
};

/**
 * Test the connection to the Oura API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.testOuraConnection = async (req, res) => {
  try {
    console.log('Testing Oura connection...');
    
    // Fetch a small amount of data to test the connection
    const data = await ouraService.fetchLatestOuraData(1);
    
    // Return a success response
    res.json({
      message: 'Oura connection successful',
      data: {
        sleep: data.sleep ? data.sleep.data.length : 0,
        dailySleep: data.dailySleep ? data.dailySleep.data.length : 0,
        activity: data.activity ? data.activity.data.length : 0,
        readiness: data.readiness ? data.readiness.data.length : 0
      }
    });
  } catch (error) {
    console.error('Error testing Oura connection:', error);
    res.status(500).json({
      error: 'Error testing Oura connection',
      details: error.message
    });
  }
};

/**
 * Get data by type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getData = async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;
    
    console.log(`Getting ${type} data...`);
    
    // Get the current date and 30 days ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    // Fetch data for the specified type
    const data = await ouraService.fetchDataForQuery(type, startDate, endDate, parseInt(limit));
    
    // Return the data
    res.json(data);
  } catch (error) {
    console.error(`Error getting ${req.params.type} data:`, error);
    res.status(500).json({
      error: `Error getting ${req.params.type} data`,
      details: error.message
    });
  }
}; 