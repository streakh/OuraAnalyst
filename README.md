# OuraAnalyst - Oura Ring Data Query System

OuraAnalyst is a web application that allows you to query your Oura Ring data using natural language. It combines the power of the Oura API v2 with ChatGPT to provide personalized insights and recommendations based on your health data.

## Open Source Code Used
- The dependencies in the package.json file contain all of the open source code that was used. This includes the following:
  - Langchain JS and @langchain/openai for calling the openAI API and chaining requests
  - Axios for HTTP requests (specifically for calling Oura API)
  - body-parser for parsing HTTP requests
  - dotenv for loading environment variables like API keys and mongoDB auth credentials
  - express for building the backend server
  - mongoose for connecting to mongoDB and defining schema
  - nodemon for automatically restarting node server after changes while developing
  - Bootstrap for front-end CSS framework styling
  - Marked.js for parsing markdown text and converting to HTML
- These were all used in my own ways and no code was borrowed from external sources.
## Features

- **Natural Language Queries**: Ask questions about your sleep, activity, and readiness in plain English
- **Comprehensive Data Storage**: Stores sleep, activity, and readiness data from the Oura API v2
- **Personalized Recommendations**: Get AI-powered recommendations based on your health patterns
- **Historical Analysis**: Compare your data over time to identify trends and patterns

## Architecture

### Data Flow

1. **Data Collection**: The application fetches data from the Oura API v2 using your personal access token
2. **Data Storage**: The data is stored in MongoDB with separate collections for sleep, activity, and readiness
3. **Data Retrieval**: When you ask a question, the application retrieves the relevant data based on the query type and date range
4. **AI Analysis**: The data is sent to the OpenAI API for analysis and insights
5. **Response**: The insights are returned to you in a readable format


## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Oura Ring account with API access
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/streakh/OuraAnalyst.git
   cd OuraAnalyst
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   CHATGPT_KEY=your_openai_api_key
   OURA_API_KEY=your_oura_api_key
   PORT=3000
   MONGO_USERNAME=your_mongo_username
   MONGO_PASSWORD=your_mongo_password
   MONGO_HOST=127.0.0.1
   MONGO_PORT=27017
   MONGO_DB=ourarag
   MONGO_AUTH_SOURCE=ourarag
   ```

4. Start the application:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Oura API v2 Integration

This application uses the Oura API v2 to fetch the following data types:

- **Sleep**: `/v2/usercollection/sleep`
- **Activity**: `/v2/usercollection/daily_activity`
- **Readiness**: `/v2/usercollection/daily_readiness`

For more information about the Oura API v2, visit the [official documentation](https://cloud.ouraring.com/v2/docs).

## Usage Examples

### Updating Your Data
- Every time the server starts the data is automatically updated on the first query
- Subsequently, when a query is received and at least one hour has passed since the last successful update check it will update again.


### Querying Your Data

Use the web interface to ask questions about your data, such as:

- "How was my sleep last week?"
- "What's my average HRV over the past month?"
- "When did I get my best sleep score?"
- "What's my readiness trend?"
- "Give me recommendations to improve my sleep based on my data."


## Acknowledgments

- Oura Ring for providing the API
- OpenAI for the ChatGPT API