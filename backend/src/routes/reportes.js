const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/mauth');
const reportesCtrl = require('../controllers/reportesController');

// JSON
router.get('/estado-operativo', verificarToken, reportesCtrl.estadoOperativo);
router.get('/flujo', verificarToken, reportesCtrl.reporteFlujo);
router.get('/incidentes', verificarToken, reportesCtrl.historialIncidentes);
router.get('/mantenimientos', verificarToken, reportesCtrl.reporteMantenimientos);

// PDF
router.get("/flujo/pdf", verificarToken, reportesCtrl.reporteFlujoPDF);
router.get("/incidentes/pdf", verificarToken, reportesCtrl.historialIncidentesPDF);
router.get("/mantenimientos/pdf", verificarToken, reportesCtrl.reporteMantenimientosPDF);

module.exports = router;