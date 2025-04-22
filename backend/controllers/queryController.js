// backend/controllers/queryController.js
const chatbotService = require('../services/chatbotService');
const ouraService = require('../services/ouraService');
const dataUpdateService = require('../services/dataUpdateService'); // Import the new service
// const analyticsService = require('../services/analyticsService'); // Uncomment if I integrate analytics later



exports.processQuery = async (req, res) => {
  try {
    // Update Oura data if needed based on time interval
    const updateStatus = await dataUpdateService.ensureRecentData(); // Call the new service
    const wasUpdated = updateStatus.updated;
    const currentLastUpdateTime = updateStatus.lastUpdateTime;
    const currentUpdateInterval = updateStatus.updateInterval;

    const { query } = req.body; // Removed explicitType as type detection is now mandatory
    
    // Log the incoming query
    console.log(`Processing query: "${query}"`);
    
    // Generate the insight using the chatbot service, passing only the query now
    const insightResult = await chatbotService.generateInsight(query);

    // Extract response text
    const responseText = insightResult.response;
    
    // Return the response with *merged* metadata
    res.json({ 
      response: responseText, 
      metadata: {
        ...insightResult.metadata, // Spread the metadata from the service
        // Add the controller-specific metadata
        processedAt: new Date().toISOString(), // Overwrite service processedAt with controller one for consistency
        dataUpdated: wasUpdated, 
        lastDataUpdate: currentLastUpdateTime ? new Date(currentLastUpdateTime).toISOString() : null, 
        nextScheduledUpdate: currentLastUpdateTime ? new Date(currentLastUpdateTime + currentUpdateInterval).toISOString() : null 
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