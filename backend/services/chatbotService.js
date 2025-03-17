// backend/services/chatbotService.js
const axios = require('axios');
const config = require('../config');
const ouraService = require('./ouraService');

// Helper function to determine date range from query
function parseDateRangeFromQuery(query) {
  let endDate = new Date();
  let startDate = new Date();
  startDate.setDate(endDate.getDate() - 7); // Default to last 7 days
  
  // For debugging
  console.log(`Current date: ${endDate.toISOString().split('T')[0]}`);
  
  // Check if the query mentions specific time periods
  const timeRegex = {
    yesterday: /yesterday|last night/i,
    lastWeek: /last week|past week|previous week|this week/i,
    lastMonth: /last month|past month|previous month|this month/i,
    lastFewDays: /last few days|past few days|recent days|past (\d+) days/i,
    specific: /on (\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}\/\d{1,2}\/\d{2})/i,
    dateRange: /from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})|between (\d{4}-\d{2}-\d{2}) and (\d{4}-\d{2}-\d{2})/i,
    year: /this year|past year|last year/i,
    quarter: /this quarter|past quarter|last quarter/i,
    ever: /ever|all time|overall|in total/i
  };
  
  // Extract number of days if specified
  const daysMatch = query.match(/past (\d+) days/i);
  const requestedDays = daysMatch ? parseInt(daysMatch[1]) : null;
  
  // Adjust date range based on query
  if (timeRegex.yesterday.test(query)) {
    // Create a new date for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Set to beginning of day
    
    // Set both start and end date to yesterday
    startDate = yesterday;
    endDate = new Date(yesterday);
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    
    console.log(`Yesterday query detected. Setting date to: ${startDate.toISOString().split('T')[0]}`);
  } else if (timeRegex.lastWeek.test(query)) {
    startDate.setDate(endDate.getDate() - 7);
  } else if (timeRegex.lastMonth.test(query)) {
    startDate.setMonth(endDate.getMonth() - 1);
  } else if (requestedDays) {
    // If user specified a number of days, use that (up to 30)
    const days = Math.min(requestedDays, 30);
    startDate.setDate(endDate.getDate() - days);
  } else if (timeRegex.lastFewDays.test(query)) {
    startDate.setDate(endDate.getDate() - 3);
  } else if (timeRegex.year.test(query)) {
    // Limit to 30 days even if they ask for a year
    startDate.setDate(endDate.getDate() - 30);
  } else if (timeRegex.quarter.test(query)) {
    // Limit to 30 days even if they ask for a quarter
    startDate.setDate(endDate.getDate() - 30);
  } else if (timeRegex.ever.test(query)) {
    // Limit to 30 days even if they ask for all time
    startDate.setDate(endDate.getDate() - 30);
  }
  
  // Check for specific date range in query
  const dateRangeMatch = query.match(timeRegex.dateRange);
  if (dateRangeMatch) {
    // Extract dates from the match
    const fromDate = dateRangeMatch[1] || dateRangeMatch[3];
    const toDate = dateRangeMatch[2] || dateRangeMatch[4];
    
    if (fromDate && toDate) {
      const parsedStartDate = new Date(fromDate);
      const parsedEndDate = new Date(toDate);
      
      // Validate dates and ensure range is not more than 30 days
      if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
        const dayDifference = Math.floor((parsedEndDate - parsedStartDate) / (1000 * 60 * 60 * 24));
        
        if (dayDifference <= 30) {
          startDate = parsedStartDate;
          endDate = parsedEndDate;
        } else {
          // If range is more than 30 days, limit to 30 days ending on the requested end date
          startDate = new Date(parsedEndDate);
          startDate.setDate(parsedEndDate.getDate() - 30);
          endDate = parsedEndDate;
        }
      }
    }
  }
  
  // Check for specific date in query
  const specificDateMatch = query.match(timeRegex.specific);
  if (specificDateMatch) {
    const dateStr = specificDateMatch[0].replace(/on /i, '');
    const parsedDate = new Date(dateStr);
    
    if (!isNaN(parsedDate)) {
      startDate = parsedDate;
      endDate = new Date(parsedDate);
    }
  }
  
  return { startDate, endDate };
}

// Determine appropriate data limits based on query and date range
function determineDataLimits(query, startDate, endDate) {
  // Calculate the date range in days
  const dayDifference = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Set higher database and processing limits
  let dbLimit = 60; // Increased from 14
  let processingLimit = 30; // Increased from 7
  
  if (dayDifference <= 1) {
    // For single day queries (like "yesterday")
    dbLimit = 10; // Increased from 3
    processingLimit = 10; // Increased from 3
  } else if (dayDifference <= 7) {
    // For week-long queries
    dbLimit = 30; // Increased from 10
    processingLimit = 20; // Increased from 7
  } else if (dayDifference <= 14) {
    // For two-week queries
    dbLimit = 40; // Increased from 20
    processingLimit = 30; // Increased from 14
  } else {
    // For longer queries (up to a month)
    dbLimit = 60; // Increased from 30
    processingLimit = 40; // Increased from 20
  }
  
  // Check for specific query patterns that might need more data
  if (/trend|pattern|compare|correlation|over time/i.test(query)) {
    // Trend analysis needs more data points
    dbLimit = Math.max(dbLimit, dayDifference * 2);
    processingLimit = Math.max(processingLimit, dayDifference);
  }
  
  if (/average|mean|median|typical/i.test(query)) {
    // Statistical queries benefit from more data
    dbLimit = Math.max(dbLimit, dayDifference * 2);
    processingLimit = Math.max(processingLimit, dayDifference);
  }
  
  // Remove the caps to allow more data when needed
  // dbLimit = Math.min(dbLimit, 30);
  // processingLimit = Math.min(processingLimit, 30);
  
  return { dbLimit, processingLimit };
}

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make API call with retry logic
async function makeOpenAIRequest(messages, retries = 3, backoff = 1000) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${config.chatGPTKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      // Rate limited, wait and retry
      console.log(`Rate limited, retrying in ${backoff}ms...`);
      await delay(backoff);
      return makeOpenAIRequest(messages, retries - 1, backoff * 2);
    }
    
    throw error;
  }
}

// Helper function to simplify data without limiting records
function simplifyData(data, maxRecords = 100) {
  if (Array.isArray(data)) {
    // Process all records without slicing
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
      sleep: data.sleep ? simplifyData(data.sleep, maxRecords) : [],
      activity: data.activity ? simplifyData(data.activity, maxRecords) : [],
      readiness: data.readiness ? simplifyData(data.readiness, maxRecords) : []
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
    
    // Check if this is a "yesterday" query
    const isYesterdayQuery = /yesterday|last night|yesterday night|day before/i.test(query);
    
    // Parse date range from the query
    let { startDate, endDate } = parseDateRangeFromQuery(query);
    
    // If this is a "yesterday" query, let's check if we have data for the most recent date
    if (isYesterdayQuery) {
      const mostRecentData = await ouraService.getMostRecentDataDate();
      
      if (mostRecentData) {
        const mostRecentDate = new Date(mostRecentData);
        const formattedDate = mostRecentDate.toISOString().split('T')[0];
        const yesterdayDate = startDate.toISOString().split('T')[0];
        
        console.log(`Yesterday query detected. Yesterday date: ${yesterdayDate}, Most recent data date: ${formattedDate}`);
        
        // Always use the most recent data date for "yesterday" queries
        console.log(`Using most recent date (${formattedDate}) for yesterday query`);
        
        // Create new dates for the most recent data
        const newStartDate = new Date(mostRecentDate);
        newStartDate.setHours(0, 0, 0, 0);
        const newEndDate = new Date(mostRecentDate);
        newEndDate.setHours(23, 59, 59, 999);
        
        // Use the most recent date instead
        startDate = newStartDate;
        endDate = newEndDate;
        
        // If the dates don't match, update the query to reflect the date we're actually using
        if (formattedDate !== yesterdayDate) {
          query = query.replace(/yesterday|last night/i, `on ${formattedDate}`);
        }
      }
    }
    
    // Determine appropriate limits based on the query and date range
    const { dbLimit, processingLimit } = determineDataLimits(query, startDate, endDate);
    
    console.log(`Query: "${query}" | Type: ${queryType} | Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} | Limits: DB=${dbLimit}, Processing=${processingLimit}`);
    
    // Fetch relevant Oura data based on the query type and date range
    let ouraData = await ouraService.fetchDataForQuery(queryType, startDate, endDate, dbLimit);
    
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
    const simplifiedData = simplifyData(ouraData, processingLimit);
    
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
    
    return await makeOpenAIRequest(messages);
  } catch (error) {
    console.error('Error generating insight:', error);
    throw error;
  }
};