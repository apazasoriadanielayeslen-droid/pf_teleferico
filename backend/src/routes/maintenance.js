const express = require('express');
const router = express.Router();
const maintCtrl = require('../controllers/maintenanceController');
const authMiddleware = require('../middleware/authMiddleware');

// resumen para dashboard mantenimiento
router.get('/summary', authMiddleware.verifyToken, maintCtrl.getSummary);
// lista con filtros
router.get('/list', authMiddleware.verifyToken, maintCtrl.list);
// lista técnicos (para el formulario)
router.get('/technicians', authMiddleware.verifyToken, maintCtrl.getTechnicians);
// buscar cabina por código
router.get('/cabina/code/:code', authMiddleware.verifyToken, maintCtrl.getCabinaByCode);
// creación
router.post('/create', authMiddleware.verifyToken, maintCtrl.create);

module.exports = router;
