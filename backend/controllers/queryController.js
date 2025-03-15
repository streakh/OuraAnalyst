// backend/controllers/queryController.js
const chatbotService = require('../services/chatbotService');
// const analyticsService = require('../services/analyticsService'); // Uncomment if you integrate analytics later

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
        // You could add more metadata here if needed
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