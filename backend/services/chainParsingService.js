const { PromptTemplate } = require("@langchain/core/prompts");
const { JsonOutputParser} = require("@langchain/core/output_parsers");
const { ChatOpenAI } = require("@langchain/openai");

/**
 * Uses LangChain and an LLM to extract the intended date range from a query.
 * @param {string} query - The user's natural language query.
 * @returns {Promise<{startDate: Date, endDate: Date}>} - The extracted start and end dates.
 */
async function parseDateRange(query) {

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
  async function detectQueryType(query) {
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
  
  module.exports = {
    parseDateRange,
    detectQueryType
  }