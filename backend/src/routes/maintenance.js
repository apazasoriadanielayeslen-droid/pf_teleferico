const express = require('express');
const router = express.Router();
const maintCtrl = require('../controllers/maintenanceController');
const { verificarToken } = require('../middlewares/mauth');

// resumen para dashboard mantenimiento
router.get('/summary', verificarToken, maintCtrl.getSummary);
// lista con filtros
router.get('/list', verificarToken, maintCtrl.list);
// lista técnicos (para el formulario)
router.get('/technicians', verificarToken, maintCtrl.getTechnicians);
// buscar cabina por código
router.get('/cabina/code/:code', verificarToken, maintCtrl.getCabinaByCode);
// creación
router.post('/create', verificarToken, maintCtrl.create);

module.exports = router;
