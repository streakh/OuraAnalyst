const ouraService = require('./ouraService'); // Added import

// Track when we last updated the data
let lastUpdateTime = null;
const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Checks if an Oura data update is needed based on time interval and performs it.
 * @returns {Promise<{updated: boolean, lastUpdateTime: number|null, updateInterval: number}>} 
 *          - updated: boolean indicating if an update was performed.
 *          - lastUpdateTime: timestamp of the last successful update (or current time if failed).
 *          - updateInterval: the interval used for checks.
 */
async function ensureRecentData() {
  const currentTime = Date.now();
  let updatePerformed = false;
  
  // Update if this is the first query ever or if the update interval has passed
  if (lastUpdateTime === null || (currentTime - lastUpdateTime > UPDATE_INTERVAL)) {
    const reason = lastUpdateTime === null ? 'First query detected' : 'Session timeout (1 hour) exceeded';
    console.log(`${reason}. Updating Oura data (fetching up to 1 year of historical data)...`);
    
    try {
      // Fetch the latest data from the Oura API
      const data = await ouraService.fetchLatestOuraData();
      
      // Store the data in the database
      const result = await ouraService.storeData(data);
      
      // Update the last update time
      lastUpdateTime = currentTime;
      updatePerformed = true; // Mark update as performed
      
      console.log(`Data update completed: ${result.totalCount} records updated`);
      console.log(`Next update will occur after: ${new Date(currentTime + UPDATE_INTERVAL).toLocaleString()}`);
      
    } catch (error) {
      console.error('Error in data update:', error);
      // Still update the time to prevent repeated failures
      lastUpdateTime = currentTime; // Record the attempt time even on failure
      updatePerformed = false; // Explicitly false on error
    }
  }
  
  // If we're here, no update was needed or it was just attempted (successfully or not)
  return {
    updated: updatePerformed,
    lastUpdateTime: lastUpdateTime,
    updateInterval: UPDATE_INTERVAL
  };
}

module.exports = {
  ensureRecentData
};