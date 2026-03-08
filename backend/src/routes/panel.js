const express = require('express');
const router = express.Router();
const panelController = require('../controllers/panelController');
const { verificarToken } = require('../middlewares/mauth');

router.get('/', verificarToken, panelController.getPanelStats);

module.exports = router;