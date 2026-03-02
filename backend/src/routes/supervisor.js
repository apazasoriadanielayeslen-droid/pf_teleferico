const express = require('express');
const router = express.Router();

const supervisorCtrl = require('../controllers/supervisorController');
const authMiddleware = require('../middleware/authMiddleware');

// todas las rutas bajo /api/supervisor deben llevar token válido
router.get('/overview', authMiddleware.verifyToken, supervisorCtrl.getOverview);
router.get('/stations', authMiddleware.verifyToken, supervisorCtrl.getStations);

module.exports = router;
