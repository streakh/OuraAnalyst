module.exports = {
    dbURI: process.env.DB_URI || 'mongodb://localhost:27017/ourarag',
    chatGPTKey: process.env.CHATGPT_KEY,   // Your ChatGPT API key
    ouraApiKey: process.env.OURA_API_KEY      // Your Oura API key
  };