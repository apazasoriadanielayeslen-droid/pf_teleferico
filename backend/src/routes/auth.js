// src/routes/auth.js

const express = require('express');
const router = express.Router();

// ────────────────────────────────────────────────
// IMPORTA AMBOS CONTROLADORES (los dos que tienes)
// ────────────────────────────────────────────────
const registroCtrl = require('../controllers/registroController');
const authCtrl     = require('../controllers/loginController');

router.get('/roles',    registroCtrl.getRoles);
router.post('/registro', registroCtrl.register);
router.post('/login',   authCtrl.login);        

module.exports = router;