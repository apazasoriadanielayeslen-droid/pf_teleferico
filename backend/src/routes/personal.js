const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const personalController = require('../controllers/personalController');

router.get('/personal', verificarToken, personalController.getPersonal);

module.exports = router;