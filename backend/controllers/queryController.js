// backend/controllers/queryController.js
const chatbotService = require('../services/chatbotService');
const ouraService = require('../services/ouraService');
// const analyticsService = require('../services/analyticsService'); // Uncomment if I integrate analytics later

// Track when we last updated the data
let lastUpdateTime = null;
const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Update Oura data if this is the first query of the session or if the update interval has passed
 * @returns {Promise<Object>} - Update result or null if no update was performed
 */
async function dataUpdateCheck() {
  const currentTime = Date.now();
  
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
      
      console.log(`Data update completed: ${result.totalCount} records updated`);
      console.log(`Next update will occur after: ${new Date(currentTime + UPDATE_INTERVAL).toLocaleString()}`);
      
      return result;
    } catch (error) {
      console.error('Error in data update:', error);
      // Still update the time to prevent repeated failures
      lastUpdateTime = currentTime;
      return null;
    }
  }
  
  // If we're here, no update was needed
  return null;
}

/**
 * Automatically detect the query type based on keywords in the query
 * @param {string} query - The user's query
 * @returns {string} - The detected query type
 */
function detectQueryType(query) {
  if (/sleep|slept|bed|dream|nap|snore|insomnia|rem|deep sleep|light sleep/i.test(query)) {
    return 'sleep';
  } else if (/activity|exercise|walk|run|steps|move|workout|active|calories|training/i.test(query)) {
    return 'activity';
  } else if (/ready|readiness|recovery|prepared|recover|rested|energy/i.test(query)) {
    return 'readiness';
  } else if (/recommend|suggest|advice|improve|better|enhance|tips|help me|should i|how can i/i.test(query)) {
    return 'recommendation';
  }
  return 'general';
}

exports.processQuery = async (req, res) => {
  try {
    // Update Oura data if needed based on time interval
    const updateResult = await dataUpdateCheck();
    const wasUpdated = updateResult !== null;
    
    const { query, queryType: explicitType } = req.body;
    
    // Use explicit type if provided, otherwise detect it
    const queryType = explicitType || detectQueryType(query);
    
    // Log the incoming query for debugging and improvement
    console.log(`Processing ${queryType} query: "${query}"`);
    
    // Generate the insight using the chatbot service
    const response = await chatbotService.generateInsight(query);
    
    // Return the response with metadata
    res.json({ 
      response,
      metadata: {
        queryType,
        processedAt: new Date().toISOString(),
        dataUpdated: wasUpdated,
        lastDataUpdate: lastUpdateTime ? new Date(lastUpdateTime).toISOString() : null,
        nextScheduledUpdate: lastUpdateTime ? new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: 'Error processing query', 
      details: error.message,
      suggestion: 'Please try a different query or check your connection.'
    });
  }
};