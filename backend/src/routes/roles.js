const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const rolesCtrl = require('../controllers/rolesController');

router.get('/', verificarToken, rolesCtrl.getRoles);
router.post('/', verificarToken, rolesCtrl.createRol);
router.put('/:id', verificarToken, rolesCtrl.updateRol);
router.delete('/:id', verificarToken, rolesCtrl.deleteRol);

module.exports = router;