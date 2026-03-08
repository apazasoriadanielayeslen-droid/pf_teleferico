const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const estacionesCtrl = require('../controllers/estacionesController');

router.get('/', verificarToken, estacionesCtrl.getEstaciones);
router.get("/:id", estacionesCtrl.getEstacionById); 
router.post('/', verificarToken, estacionesCtrl.crearEstacion);
router.put('/:id', verificarToken, estacionesCtrl.editarEstacion);
router.delete('/:id', verificarToken, estacionesCtrl.eliminarEstacion);

module.exports = router;