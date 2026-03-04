// estaciones.js (sin cambios mayores, ya que no afecta directamente)
const express = require('express');
const router = express.Router();
const pool = require('../config/conexion');
const { verificarToken } = require('../middlewares/mauth');

// =========================
// ESTACIONES DEL USUARIO LOGUEADO
// =========================
router.get('/', verificarToken, async (req, res) => {
  try {
    const id_personal = req.user.id;

    const [rows] = await pool.query(`
      SELECT e.id_estacion, e.nombre, e.ubicacion, e.estado
      FROM personal_estacion pe
      JOIN estaciones e ON pe.id_estacion = e.id_estacion
      WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'
      ORDER BY e.nombre
    `, [id_personal]);

    res.json(rows);

  } catch (error) {
    console.error("Error al obtener estaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error al consultar estaciones"
    });
  }
});

module.exports = router;