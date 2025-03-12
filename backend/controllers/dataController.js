// backend/controllers/dataController.js
const ouraService = require('../services/ouraService');

exports.updateOuraData = async (req, res) => {
  try {
    const data = await ouraService.fetchLatestOuraData();
    // Here you would call a function to store data in your database
    // await ouraService.storeData(data);
    res.json({ message: 'Oura data updated', data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating Oura data' });
  }
};