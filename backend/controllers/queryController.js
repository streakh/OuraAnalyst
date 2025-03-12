// backend/controllers/queryController.js
const chatbotService = require('../services/chatbotService');
// const analyticsService = require('../services/analyticsService'); // Uncomment if you integrate analytics later

exports.processQuery = async (req, res) => {
  try {
    const { query } = req.body;
    // Optionally, add analytics data if needed:
    // const stats = await analyticsService.computeSummaryStats();
    const response = await chatbotService.generateInsight(query);
    res.json({ response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error processing query' });
  }
};