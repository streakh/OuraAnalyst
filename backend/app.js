require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/apiRoutes');
const { connectDatabase } = require('./utils/database');
const config = require('./config');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/api', apiRoutes);

// Connect to database
connectDatabase(config.dbURI);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});