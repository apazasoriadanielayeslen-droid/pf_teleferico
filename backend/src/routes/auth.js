// src/routes/auth.js

const express = require('express');
const router = express.Router();

// ────────────────────────────────────────────────
// IMPORTA AMBOS CONTROLADORES (los dos que tienes)
// ────────────────────────────────────────────────
const authCtrl     = require('../controllers/loginController');

// Rutas de LOGIN (usando el controlador de autenticación)
router.post('/login',   authCtrl.login);          // ← ahora sí existe authCtrl

module.exports = router;