const express = require('express');
const router = express.Router();

const supervisorCtrl = require('../controllers/supervisorController');
const { verificarToken } = require('../middlewares/mauth');

// todas las rutas bajo /api/supervisor deben llevar token válido
router.get('/overview', verificarToken, supervisorCtrl.getOverview);
router.get('/stations', verificarToken, supervisorCtrl.getStations);
router.get('/cabinas', verificarToken, supervisorCtrl.getCabinas);
router.get('/notificationsG', verificarToken, supervisorCtrl.getNotifications);
router.put('/notifications/mark-read', verificarToken, supervisorCtrl.markNotificationsRead);

module.exports = router;
