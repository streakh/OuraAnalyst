// backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');

// Query route - single endpoint for all query types
router.post('/query', queryController.processQuery);


module.exports = router;