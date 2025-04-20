// backend/services/chatbotService.js
const axios = require('axios');
const config = require('../config');
const ouraService = require('./ouraService');

// Import LangChain components
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser, StringOutputParser } = require("@langchain/core/output_parsers");

/**
 * Uses LangChain and an LLM to extract the intended date range from a query.
 * @param {string} query - The user's natural language query.
 * @returns {Promise<{startDate: Date, endDate: Date}>} - The extracted start and end dates.
 */
async function parseDateRangeFromQuery(query) {

  const model = new ChatOpenAI({
    model: "gpt-4.1-nano",
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
  // console.log(`Current date: ${currentDate}`);

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
    // console.log('Attempting LangChain date parsing');
    const result = await chain.invoke({ 
      query: query,
      current_date: currentDate,
      format_instructions: formatInstructions
    });


    if (result && result.startDate && result.endDate) {
      const parsedStartDate = new Date(result.startDate);
      const parsedEndDate = new Date(result.endDate);

      parsedStartDate.setUTCHours(0, 0, 0, 0); 
      parsedEndDate.setUTCHours(23, 59, 59, 999);

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

/**
 * Uses LangChain and an LLM to detect which core data types are relevant to a query.
 * @param {string} query - The user's natural language query.
 * @returns {Promise<string[]>} - An array of relevant data types (e.g., ['sleep'], ['activity', 'readiness'], ['sleep', 'activity', 'readiness']).
 */
async function detectQueryTypeWithLangChain(query) {
  const model = new ChatOpenAI({
    model: "gpt-4.1-nano", // Using a fast model for classification
    temperature: 0
  });

  // Define the output schema for an array of data types
  const formatInstructions = `Respond only in valid JSON. The JSON object you return should contain a single key "relevantDataTypes" whose value is an array of strings. 
  Each string in the array must be one of the following core data types: 'sleep', 'activity', 'readiness'. The array can contain one, two, or all three types, depending on what's relevant to the query. 
  If the query asks for recommendations or is general, include all types that might inform the answer.

  Example formats:
  { "relevantDataTypes": ["sleep"] }
  { "relevantDataTypes": ["activity", "readiness"] }
  { "relevantDataTypes": ["sleep", "activity", "readiness"] }`;

  const parser = new JsonOutputParser();

  const template = `Analyze the user's query to determine which core Oura data types are needed to provide a comprehensive answer. The available core data types are 'sleep', 'activity', and 'readiness'.

        Identify ALL relevant data types based on the query:
        - If the query is specifically about sleep (patterns, quality, duration, stages, bedtime, wake time, naps), include 'sleep'.
        - If the query is specifically about physical movement (steps, calories, exercise, workouts, activity levels, distance, MET), include 'activity'.
        - If the query is specifically about recovery or state (readiness score, HRV, body temperature, resting heart rate, energy levels), include 'readiness'.
        - If the query asks for recommendations, advice, or compares data across categories (e.g., "how did my run affect my sleep?", "tips for better recovery"), include ALL data types ('sleep', 'activity', 'readiness') as they might all be relevant.
        - If the query is general or vague (e.g., "how was my day?", "summarize my week"), include ALL data types ('sleep', 'activity', 'readiness').

        Respond ONLY with a JSON object matching the schema described below:
        {format_instructions}

        User Query: "{query}"

        JSON Response:`;

  const prompt = PromptTemplate.fromTemplate(template);

  const chain = prompt.pipe(model).pipe(parser);

  // Default to all types if detection fails
  const fallbackTypes = ['sleep', 'activity', 'readiness'];

  try {
    // console.log('Attempting LangChain data type detection');
    const result = await chain.invoke({
      query: query,
      format_instructions: formatInstructions
    });

    // Validate the result structure and content
    if (result && Array.isArray(result.relevantDataTypes) && result.relevantDataTypes.length > 0) {
       const validTypes = result.relevantDataTypes.filter(type => ['sleep', 'activity', 'readiness'].includes(type));
       if (validTypes.length === result.relevantDataTypes.length) {
         // Ensure unique types
         const uniqueTypes = [...new Set(validTypes)];
         console.log(`LangChain detected relevant data types: ${JSON.stringify(uniqueTypes)}`);
         return uniqueTypes;
       } else {
          console.warn(`LangChain returned array with invalid types: ${JSON.stringify(result.relevantDataTypes)}. Falling back to all types.`);
       }
    } else {
      console.warn(`LangChain returned invalid or unexpected structure: ${JSON.stringify(result)}. Falling back to all types.`);
    }
  } catch (error) {
    console.error(`Error during LangChain data type detection: ${error.message}. Falling back to all types.`);
  }

  // Fallback if detection fails or returns invalid format
  console.log(`Falling back to default data types: ${JSON.stringify(fallbackTypes)}`);
  return fallbackTypes;
}

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

// Helper function to simplify data
function simplifyData(data) {
  if (Array.isArray(data)) {
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


async function generateInsight(query) {
  try {
    // Run date range and query type parsing in parallel
    console.log(`Initiating parallel parsing for query: "${query}"`);
    const [dateResult, typeResult] = await Promise.all([
      parseDateRangeFromQuery(query),
      detectQueryTypeWithLangChain(query)
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
        metadata: { queryType: relevantDataTypes } 
    };

  } catch (error) {
    console.error('Error generating insight:', error);
    throw error; 
  }
}

// Export the functions
module.exports = {
  parseDateRangeFromQuery,
  detectQueryTypeWithLangChain,
  generateInsight,
};