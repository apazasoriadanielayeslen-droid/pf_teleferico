const express = require('express');
const router = express.Router();

const tecnicoCtrl = require('../controllers/tecnicoController');
const { verificarToken } = require('../middlewares/mauth');

// todas las rutas bajo /api/tecnico requieren token válido
router.get('/overview', verificarToken, tecnicoCtrl.getOverview);
router.get('/mantenimientos', verificarToken, tecnicoCtrl.getMantenimientos);
router.get('/mantenimiento/:id', verificarToken, tecnicoCtrl.getMantenimientoDetalle);
router.put('/mantenimiento/:id/finalizar', verificarToken, tecnicoCtrl.finalizarMantenimiento);
router.post('/notificacion', verificarToken, tecnicoCtrl.enviarNotificacion);

module.exports = router;