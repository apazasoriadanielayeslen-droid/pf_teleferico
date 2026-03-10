const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const personalAdminController = require('../controllers/personalAdministradorController');

// Obtener supervisores para asignación a estaciones
router.get('/supervisores', verificarToken, personalAdminController.getSupervisores);

module.exports = router;
