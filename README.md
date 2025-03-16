# OuraRAG - Oura Ring Data Query System

OuraRAG is a web application that allows you to query your Oura Ring data using natural language. It combines the power of the Oura API v2 with ChatGPT to provide personalized insights and recommendations based on your health data.

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
4. **AI Analysis**: The data is sent to ChatGPT for analysis and insights
5. **Response**: The insights are returned to you in a readable format

### API Endpoints

#### Data Management

- `POST /api/update`: Update Oura data (optional query param: `days` to specify how many days to fetch)
- `GET /api/test-oura`: Test Oura API connection

#### Data Retrieval

- `GET /api/data/sleep`: Get sleep data (query params: `start_date`, `end_date`)
- `GET /api/data/activity`: Get activity data (query params: `start_date`, `end_date`)
- `GET /api/data/readiness`: Get readiness data (query params: `start_date`, `end_date`)
- `GET /api/data/general`: Get all data types (query params: `start_date`, `end_date`)

#### Queries

- `POST /api/query`: Process a natural language query about your Oura data

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Oura Ring account with API access
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ourarag.git
   cd ourarag
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   DB_URI=mongodb://localhost:27017/ourarag
   CHATGPT_KEY=your_openai_api_key
   OURA_API_KEY=your_oura_api_key
   PORT=3000
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

### Updating Oura Data

To fetch and store the latest data from your Oura Ring:

```
curl -X POST http://localhost:3000/api/update
```

To fetch and store data for a specific number of days:

```
curl -X POST "http://localhost:3000/api/update?days=7"
```

### Retrieving Data

To retrieve sleep data for a specific date range:

```
curl "http://localhost:3000/api/data/sleep?start_date=2023-01-01&end_date=2023-01-31"
```

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