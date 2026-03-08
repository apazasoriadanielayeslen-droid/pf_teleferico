const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const registroCtrl = require('../controllers/registroController');

// Listar usuarios
router.get('/activos', verificarToken, registroCtrl.getUsuariosActivos);
router.get('/inactivos', verificarToken, registroCtrl.getUsuariosInactivos);

// Registrar usuario
router.post('/', verificarToken, registroCtrl.register);

// Actualizar usuario
router.put('/:id', verificarToken, registroCtrl.updateUsuario);

// Eliminar usuario
router.delete('/:id', verificarToken, registroCtrl.deleteUsuario);
router.patch('/reactivar/:id', verificarToken, registroCtrl.reactivarUsuario);

module.exports = router;