// backend/services/chatbotService.js
// const axios = require('axios');
const config = require('../config');
const ouraService = require('./ouraService');
const { simplifyData } = require('../utils/dataUtils');
const { parseDateRange, detectQueryType } = require('./chainParsingService');
// Import LangChain components
const { ChatOpenAI } = require("@langchain/openai");


// Helper function to make API call with retry logic
async function makeOpenAIRequest(messages) {

  const model = new ChatOpenAI({
    model: "o4-mini",
    temperature: 1,
    max_tokens: 2000
  });

  try {
    const response = await model.invoke(messages);
    return response.content;

  } catch (error) {
    console.error('Error making OpenAI request:', error);
    throw error;
  }
}




async function generateInsight(query) {
  try {
    // Run date range and query type parsing in parallel
    console.log(`Initiating parallel parsing for query: "${query}"`);
    const [dateResult, typeResult] = await Promise.all([
      parseDateRange(query),
      detectQueryType(query)
    ]);

    const { startDate, endDate } = dateResult;
    const relevantDataTypes = typeResult; // This is already the array, e.g., ['sleep']


    // Fetch data using ouraService
    console.log(`Calling ouraService.fetchDataForQuery with types: ${JSON.stringify(relevantDataTypes)}`);
    const ouraData = await ouraService.fetchDataForQuery(relevantDataTypes, startDate, endDate);
    
    // Check if any data was returned from the queries
    // (ouraData is now guaranteed to be an object {sleep:[], activity:[], readiness:[]})
    const hasData = 
      (ouraData.sleep && ouraData.sleep.length > 0) || 
      (ouraData.activity && ouraData.activity.length > 0) || 
      (ouraData.readiness && ouraData.readiness.length > 0);

    // No data found handling (using the correct ouraService function now)
    if (!hasData) {
      const mostRecentData = await ouraService.getMostRecentDataDate(); // Correct function call

      if (mostRecentData) {
        const formattedDate = mostRecentData.toISOString().split('T')[0];
        const message = `I couldn't find any Oura data for the specified time period (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}). The most recent data available is from ${formattedDate}. Try asking about that date or a range including it.`;
        return { 
          response: message,
          metadata: { queryType: relevantDataTypes } // Return detected types even if no data found
        };
      }

      return { 
        response: `I couldn't find any Oura data stored for the specified time period (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}). Please try a different query or ensure your data has been fetched and stored.`,
        metadata: { queryType: relevantDataTypes } // Return detected types even if no data found
      };
    }

    // Simplify the data retrieved from DB
    // simplifyData already expects an object like {sleep: [...], activity: [...], readiness: [...]}
    const simplifiedData = simplifyData(ouraData);


    // Determine which types were actually returned for the system message
    const returnedTypes = [];
    if (ouraData.sleep.length > 0) returnedTypes.push('Sleep');
    if (ouraData.activity.length > 0) returnedTypes.push('Activity');
    if (ouraData.readiness.length > 0) returnedTypes.push('Readiness');

    // System message preparation
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant that provides insights and recommendations based on Oura Ring health data.
      You have access to the following data types from the user's Oura Ring for the requested period: ${returnedTypes.join(', ')}.
      - Sleep data (sleep score, sleep duration, deep sleep, REM sleep, etc.)
      - Activity data (steps, calories, activity levels, etc.)
      - Readiness data (readiness score, HRV balance, recovery index, etc.)

      Please analyze the provided data and give thoughtful, personalized insights and recommendations relevant to the user's query.
      If the data is in minutes, convert it to hours and minutes where appropriate (e.g., 135 minutes -> 2 hours 15 minutes).
      If the user asks for a calculation, provide the result directly unless the underlying data is simple or requested.
      If the user asks about data that's not available for the period, kindly let them know.
      Always be helpful, concise, and focus on actionable advice based on the data.
      Format your response in a clear, readable way using markdown formatting where appropriate.
      Ensure your response is concise and directly addresses the user's query, while still providing all the necessary information.`
    };

    // Context message preparation
    const contextMessage = {
      role: 'system',
      content: `Here is the relevant Oura data for your analysis:
      Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
      Relevant Data Types Requested by Query Analyzer: ${JSON.stringify(relevantDataTypes)}

      ${JSON.stringify(simplifiedData, null, 2)}` // Send simplified data from DB
    };


    const messages = [
      systemMessage,
      contextMessage,
      { role: 'user', content: query }
    ];

    const responseText = await makeOpenAIRequest(messages);
    // Return both the response text and the detected query type
    return { 
        response: responseText,
        metadata: {
          queryType: relevantDataTypes,
          dateRange: {
            start : startDate.toISOString().split('T')[0],
            end   : endDate.toISOString().split('T')[0]
          },
          rawData: ouraData,
          simplifiedData: simplifiedData,
          processedAt: new Date().toISOString(),
        }
    };

  } catch (error) {
    console.error('Error generating insight:', error);
    throw error; 
  }
}

// Export the functions
module.exports = {
  generateInsight,
};