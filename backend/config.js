module.exports = {
    dbURI: process.env.DB_URI || 'mongodb://localhost:27017/ourarag',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,   // Your OpenAI API key
    ouraApiKey: process.env.OURA_API_KEY      // Your Oura API key
  };