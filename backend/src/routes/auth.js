// src/routes/auth.js

const express = require('express');
const router = express.Router();

// ────────────────────────────────────────────────
// IMPORTA AMBOS CONTROLADORES (los dos que tienes)
// ────────────────────────────────────────────────
const registroCtrl = require('../controllers/registroController');
const authCtrl     = require('../controllers/authController');   // ← esta línea faltaba

// Rutas de REGISTRO y ROLES (usando el controlador de registro)
router.get('/roles',    registroCtrl.getRoles);
router.post('/registro', registroCtrl.register);

// Rutas de LOGIN (usando el controlador de autenticación)
router.post('/login',   authCtrl.login);          // ← ahora sí existe authCtrl

module.exports = router;