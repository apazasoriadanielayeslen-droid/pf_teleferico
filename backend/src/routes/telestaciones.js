const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const telestacionesCtrl = require('../controllers/telestacionesController');

router.get('/', verificarToken, telestacionesCtrl.getTelestaciones);
router.get('/:id', verificarToken, telestacionesCtrl.getTelestacionById);
router.post('/', verificarToken, telestacionesCtrl.crearTelestacion);
router.put('/:id', verificarToken, telestacionesCtrl.editarTelestacion);
router.delete('/:id', verificarToken, telestacionesCtrl.eliminarTelestacion);

module.exports = router;