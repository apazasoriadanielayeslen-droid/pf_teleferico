const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const cabinasCtrl = require('../controllers/cabinasController');

router.get('/', verificarToken, cabinasCtrl.getCabinas);
router.post('/', verificarToken, cabinasCtrl.createCabina);
router.put('/:id', verificarToken, cabinasCtrl.updateCabina);
router.delete('/:id', verificarToken, cabinasCtrl.deleteCabina);

module.exports = router;