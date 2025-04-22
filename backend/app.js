require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const { connectDatabase } = require('./utils/database');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;



app.use(bodyParser.json());

// API routes
app.use('/api', apiRoutes);

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect to database
connectDatabase(config.dbURI);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});