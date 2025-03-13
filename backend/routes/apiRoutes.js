// backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const dataController = require('../controllers/dataController');

router.post('/query', queryController.processQuery);
router.post('/update', dataController.updateOuraData);
router.get('/test-oura', dataController.testOuraConnection);

module.exports = router;