// backend/services/chatbotService.js
const axios = require('axios');
const config = require('../config');

exports.generateInsight = async (query) => {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: query }]
    }, {
      headers: {
        'Authorization': `Bearer ${config.chatGPTKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating insight:', error);
    throw error;
  }
};