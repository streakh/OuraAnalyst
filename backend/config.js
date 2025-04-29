function getDbUri() {
  if (process.env.DB_URI) {
    console.log("Using DB_URI from environment variable.");
    return process.env.DB_URI;
  }

  if (process.env.MONGO_USERNAME && process.env.MONGO_PASSWORD) {
    const username = encodeURIComponent(process.env.MONGO_USERNAME);
    const password = encodeURIComponent(process.env.MONGO_PASSWORD);
    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = process.env.MONGO_PORT || '27017';
    const db = process.env.MONGO_DB || 'ourarag';
    const authSource = process.env.MONGO_AUTH_SOURCE || db; // Default authSource to the database itself

    console.log(`Building MongoDB URI from individual environment variables (Host: ${host}, DB: ${db}, AuthSource: ${authSource}).`);
    return `mongodb://${username}:${password}@${host}:${port}/${db}?authSource=${authSource}`;
  }

  // If neither DB_URI nor individual credentials are provided, throw an error.
  throw new Error(
    'MongoDB connection credentials missing. Please set either the full DB_URI or ' +
    'both MONGO_USERNAME and MONGO_PASSWORD environment variables (optionally MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_AUTH_SOURCE).' 
  );
}

module.exports = {
  dbURI: getDbUri(),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ouraApiKey: process.env.OURA_API_KEY      
};