// backend/services/chatbotService.js
const axios = require('axios');
const config = require('../config');
const ouraService = require('./ouraService');

// Import LangChain components
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser } = require("@langchain/core/output_parsers");

/**
 * Uses LangChain and an LLM to extract the intended date range from a query.
 * @param {string} query - The user's natural language query.
 * @returns {Promise<{startDate: Date, endDate: Date}>} - The extracted start and end dates.
 */
async function parseDateRangeFromQuery(query) {

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0
  });

  // Keep format instructions as plain text
  const formatInstructions = `Respond only in valid JSON. The JSON object you return should match the following schema:
  {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  }`;

  const parser = new JsonOutputParser();

  const currentDate = new Date().toISOString().split('T')[0];
  console.log(`Current date: ${currentDate}`);

  const template = `Analyze the user's query to determine the relevant date range.
        The current date is {current_date}. Use this for relative calculations (e.g., 'yesterday', 'last week').

        Respond ONLY with a JSON object matching the following schema:
        {format_instructions}

        - If a specific date is mentioned (e.g., "on 2023-10-26"), set both startDate and endDate to that date.
        - For "yesterday" use the date for the previous day.
        - For "today", use the date of the current day.
        - For "last week", use the 7-day period ending yesterday.
        - For "last month", use the entire previous calendar month.
        - For "last 7 days", use the 7 days ending today.
        - For "this week", use the period from the previous Sunday to today.
        - For "this month", use the period from the 1st of the current month to today.
        - If no specific date or range is mentioned, or it's ambiguous (e.g., "how was my sleep?"), default to the last 7 days ending today.
        - For queries like "ever" or "all time", return the last 30 days ending today. The application will handle data limits separately.

        User Query: "{query}"

        JSON Response:`;

  const prompt = PromptTemplate.fromTemplate(template);

  const chain = prompt.pipe(model).pipe(parser);

  // Default date values (last 7 days) - used if parsing fails
  let endDate = new Date();
  let startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  try {
    console.log(`Attempting LangChain date parsing"`);
    const result = await chain.invoke({ 
      query: query,
      current_date: currentDate,
      format_instructions: formatInstructions
    });

    // console.log("LangChain date extraction result: ", result); // Optional: Keep for detailed debugging

    if (result && result.startDate && result.endDate) {
      const parsedStartDate = new Date(result.startDate);
      const parsedEndDate = new Date(result.endDate);

      // parsedStartDate.setUTCHours(0, 0, 0, 0); 
      // parsedEndDate.setUTCHours(23, 59, 59, 999);

      if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate) && parsedStartDate <= parsedEndDate) {
        console.log(`LangChain parsed dates: ${result.startDate} to ${result.endDate}`);
        return { startDate: parsedStartDate, endDate: parsedEndDate };
      } else {
        console.warn(`LangChain returned invalid date range: ${result.startDate} - ${result.endDate}. Falling back to default.`);
      }
    } else {
       console.warn("LangChain did not return complete startDate/endDate. Falling back to default.");
    }
  } catch (error) {
    console.error(`Error during LangChain date parsing: ${error.message}`);
  }
  
  // Return default date range if parsing failed or resulted in invalid dates
  console.log(`Falling back to default date range (last 7 days).`);
  return { startDate, endDate };
}

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API call with retry logic
async function makeOpenAIRequest(messages) {

  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7,
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

// Helper function to simplify data without limiting records
function simplifyData(data) {
  if (Array.isArray(data)) {
    // Process all records without slicing or limiting
    return data.map(record => {
      // Extract all fields from the schemas
      const { 
        id, day, 
        // Sleep specific
        bedtime_start, bedtime_end, sleep_score, total_sleep_duration, deep_sleep_duration, 
        rem_sleep_duration, light_sleep_duration, awake_time, latency, efficiency, 
        restless_periods, average_heart_rate, lowest_heart_rate, average_hrv, 
        temperature_deviation, readiness, heart_rate, hrv,
        // Activity specific
        activity_score, active_calories, steps, equivalent_walking_distance,
        high_activity_time, medium_activity_time, low_activity_time, average_met_minutes,
        high_activity_met_minutes, inactivity_alerts, low_activity_met_minutes,
        medium_activity_met_minutes, meters_to_target, non_wear_time, resting_time,
        sedentary_met_minutes, sedentary_time, target_calories, target_meters, total_calories,
        // Readiness specific
        score, activity_balance, body_temperature, hrv_balance, recovery_index,
        resting_heart_rate, sleep_balance, previous_day_activity, previous_night,
        temperature_trend_deviation
      } = record;
      
      return {
        date: day instanceof Date ? day.toISOString().split('T')[0] : day,
        // Include all fields conditionally based on what's available
        // Sleep data
        ...(bedtime_start !== undefined && { bedtime_start }),
        ...(bedtime_end !== undefined && { bedtime_end }),
        ...(sleep_score !== undefined && { sleep_score }),
        ...(total_sleep_duration !== undefined && { 
          total_sleep_duration: Math.round(total_sleep_duration / 60) + " minutes" 
        }),
        ...(deep_sleep_duration !== undefined && { 
          deep_sleep_duration: Math.round(deep_sleep_duration / 60) + " minutes" 
        }),
        ...(rem_sleep_duration !== undefined && { 
          rem_sleep_duration: Math.round(rem_sleep_duration / 60) + " minutes" 
        }),
        ...(light_sleep_duration !== undefined && { 
          light_sleep_duration: Math.round(light_sleep_duration / 60) + " minutes" 
        }),
        ...(awake_time !== undefined && { 
          awake_time: Math.round(awake_time / 60) + " minutes" 
        }),
        ...(latency !== undefined && { latency: Math.round(latency) + " seconds" }),
        ...(efficiency !== undefined && { efficiency: efficiency + "%" }),
        ...(restless_periods !== undefined && { restless_periods }),
        ...(average_heart_rate !== undefined && { average_heart_rate }),
        ...(lowest_heart_rate !== undefined && { lowest_heart_rate }),
        ...(average_hrv !== undefined && { average_hrv }),
        ...(temperature_deviation !== undefined && { temperature_deviation }),
        ...(readiness !== undefined && { readiness }),
        ...(heart_rate !== undefined && { heart_rate }),
        ...(hrv !== undefined && { hrv }),
        
        // Activity data
        ...(activity_score !== undefined && { activity_score }),
        ...(active_calories !== undefined && { active_calories }),
        ...(steps !== undefined && { steps }),
        ...(equivalent_walking_distance !== undefined && { 
          equivalent_walking_distance: equivalent_walking_distance + " meters" 
        }),
        ...(high_activity_time !== undefined && { 
          high_activity_time: Math.round(high_activity_time / 60) + " minutes" 
        }),
        ...(medium_activity_time !== undefined && { 
          medium_activity_time: Math.round(medium_activity_time / 60) + " minutes" 
        }),
        ...(low_activity_time !== undefined && { 
          low_activity_time: Math.round(low_activity_time / 60) + " minutes" 
        }),
        ...(average_met_minutes !== undefined && { average_met_minutes }),
        ...(high_activity_met_minutes !== undefined && { high_activity_met_minutes }),
        ...(inactivity_alerts !== undefined && { inactivity_alerts }),
        ...(low_activity_met_minutes !== undefined && { low_activity_met_minutes }),
        ...(medium_activity_met_minutes !== undefined && { medium_activity_met_minutes }),
        ...(meters_to_target !== undefined && { meters_to_target }),
        ...(non_wear_time !== undefined && { 
          non_wear_time: Math.round(non_wear_time / 60) + " minutes" 
        }),
        ...(resting_time !== undefined && { 
          resting_time: Math.round(resting_time / 60) + " minutes" 
        }),
        ...(sedentary_met_minutes !== undefined && { sedentary_met_minutes }),
        ...(sedentary_time !== undefined && { 
          sedentary_time: Math.round(sedentary_time / 60) + " minutes" 
        }),
        ...(target_calories !== undefined && { target_calories }),
        ...(target_meters !== undefined && { target_meters }),
        ...(total_calories !== undefined && { total_calories }),
        
        // Readiness data
        ...(score !== undefined && { readiness_score: score }),
        ...(activity_balance !== undefined && { activity_balance }),
        ...(body_temperature !== undefined && { body_temperature }),
        ...(hrv_balance !== undefined && { hrv_balance }),
        ...(recovery_index !== undefined && { recovery_index }),
        ...(resting_heart_rate !== undefined && { resting_heart_rate }),
        ...(sleep_balance !== undefined && { sleep_balance }),
        ...(previous_day_activity !== undefined && { previous_day_activity }),
        ...(previous_night !== undefined && { previous_night }),
        ...(temperature_trend_deviation !== undefined && { temperature_trend_deviation })
      };
    });
  } else {
    // Handle object with multiple data types
    return {
      sleep: data.sleep ? simplifyData(data.sleep) : [],
      activity: data.activity ? simplifyData(data.activity) : [],
      readiness: data.readiness ? simplifyData(data.readiness) : []
    };
  }
}

exports.generateInsight = async (query) => {
  try {
    // Check for keywords related to each data type
    const hasSleepKeywords = /sleep|slept|bed|dream|nap|snore|insomnia|rem|deep sleep|light sleep/i.test(query);
    const hasActivityKeywords = /activity|exercise|walk|run|steps|move|workout|active|calories|training/i.test(query);
    const hasReadinessKeywords = /ready|readiness|recovery|prepared|recover|rested|energy|temperature|temp/i.test(query);
    const hasRecommendationKeywords = /recommend|suggest|advice|improve|better|enhance|tips|help me|should i|how can i/i.test(query);
    
    // Determine query type based on keyword combinations
    let queryType = 'general';
    
    // If query contains keywords from multiple categories, use 'general'
    if ((hasSleepKeywords && hasActivityKeywords) || 
        (hasSleepKeywords && hasReadinessKeywords) || 
        (hasActivityKeywords && hasReadinessKeywords)) {
      queryType = 'general';
      console.log('Mixed query detected with multiple data types. Using general query type.');
    }
    // Otherwise, use the specific category
    else if (hasSleepKeywords) {
      queryType = 'sleep';
    } else if (hasActivityKeywords) {
      queryType = 'activity';
    } else if (hasReadinessKeywords) {
      queryType = 'readiness';
    } else if (hasRecommendationKeywords) {
      queryType = 'recommendation';
    }
    
    // Parse date range from the query - now with await
    let { startDate, endDate } = await parseDateRangeFromQuery(query);
    
    console.log(`Query: "${query}" | Type: ${queryType} | Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Fetch relevant Oura data based on the query type and date range
    let ouraData = await ouraService.fetchDataForQuery(queryType, startDate, endDate);
    
    // If no data is found, return a helpful message
    if (!ouraData || 
        (Array.isArray(ouraData) && ouraData.length === 0) || 
        (ouraData.sleep && ouraData.sleep.length === 0 && 
         ouraData.activity && ouraData.activity.length === 0 && 
         ouraData.readiness && ouraData.readiness.length === 0)) {
      
      // Get the most recent data date
      const mostRecentData = await ouraService.getMostRecentDataDate();
      
      if (mostRecentData) {
        const mostRecentDate = new Date(mostRecentData);
        const formattedDate = mostRecentDate.toISOString().split('T')[0];
        
        return `I couldn't find any Oura data for the specified time period. The most recent data available is from ${formattedDate}. Try asking about that date instead, for example: "What was my sleep score on ${formattedDate}?"`;
      }
      
      return "I couldn't find any Oura data for the specified time period. Please try a different query or make sure your Oura data is up to date.";
    }
    
    // Simplify and limit the data to avoid token limits
    const simplifiedData = simplifyData(ouraData);
    
    // Prepare a system message that explains what data is available
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant that provides insights and recommendations based on Oura Ring health data. 
      You have access to the following data from the user's Oura Ring: 
      - Sleep data (sleep score, sleep duration, deep sleep, REM sleep, etc.)
      - Activity data (steps, calories, activity levels, etc.)
      - Readiness data (readiness score, HRV balance, recovery index, etc.)
      
      Please analyze the data provided and give thoughtful, personalized insights and recommendations. If the data is in minutes, convert it to hours and minutes where appropriate.
      If the user asks for a calculation, do not show all of the data just the result, unless they ask for it or it is very simple.
      If the user asks about data that's not available, kindly let them know and suggest what data they could ask about instead.
      Always be helpful, concise, and focus on actionable advice based on the data. 
      Format your response in a clear, readable way using markdown formatting where appropriate.
      Ensure your response is concise and directly addresses the user's query, while still providing all the necessary information.`
    };
    
    // Prepare a context message with the relevant data
    const contextMessage = {
      role: 'system',
      content: `Here is the relevant Oura data for your analysis:
      Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
      Query Type: ${queryType}
      
      ${JSON.stringify(simplifiedData, null, 2)}`
    };
    
    // Make the API call to ChatGPT with the data context and retry logic
    const messages = [
      systemMessage,
      contextMessage,
      { role: 'user', content: query }
    ];
    
    const response = await makeOpenAIRequest(messages);
    return response;

  } catch (error) {
    console.error('Error generating insight:', error);
    throw error;
  }
};