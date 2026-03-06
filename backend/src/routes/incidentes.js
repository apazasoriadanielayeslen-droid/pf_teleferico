// src/routes/incidentes.js

const express = require('express');
const router = express.Router();
const db = require('../config/conexion');
const { verificarToken } = require('../middlewares/mauth');

// GET /api/incidentes/resumen (tarjetas)
router.get('/resumen', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;

  try {
    const [estaciones] = await db.query(`
      SELECT id_estacion FROM personal_estacion 
      WHERE id_personal = ? AND estado = 'ACTIVO'
    `, [id_personal]);

    if (estaciones.length === 0) {
      return res.json({ total: 0, abiertos: 0, en_proceso: 0, resueltos: 0 });
    }

    const ids = estaciones.map(e => e.id_estacion);
    const placeholders = ids.map(() => '?').join(',');

    const [counts] = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'ABIERTO' THEN 1 ELSE 0 END) AS abiertos,
        SUM(CASE WHEN estado = 'EN_PROCESO' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'RESUELTO' THEN 1 ELSE 0 END) AS resueltos
      FROM incidentes
      WHERE id_estacion IN (${placeholders})
    `, ids);

    res.json(counts[0]);
  } catch (err) {
    console.error('Error /resumen:', err);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
});

// GET /api/incidentes/recientes (solo ABIERTO y EN_PROCESO)
router.get('/recientes', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;

  try {
    const [rows] = await db.query(`
      SELECT 
        i.id_incidente,
        i.titulo,
        i.descripcion,
        i.estado,
        i.nivel_criticidad,
        i.fecha_reporte,
        e.nombre AS estacion,
        CONCAT(p.nombres, ' ', p.apellido1) AS reportado_por
      FROM incidentes i
      LEFT JOIN estaciones e ON i.id_estacion = e.id_estacion
      LEFT JOIN personal p ON i.id_reportado_por = p.id_personal
      WHERE i.id_estacion IN (
        SELECT pe.id_estacion 
        FROM personal_estacion pe 
        WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'
      )
      AND i.estado IN ('ABIERTO', 'EN_PROCESO')
      ORDER BY i.fecha_reporte DESC
      LIMIT 10
    `, [id_personal]);

    res.json(rows);
  } catch (err) {
    console.error('Error /recientes:', err);
    res.status(500).json({ success: false, message: 'Error al obtener incidentes recientes' });
  }
});

// Rutas del modal
router.get('/estaciones/asignadas', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT e.id_estacion, e.nombre
      FROM estaciones e
      INNER JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion
      WHERE pe.id_personal = ? 
        AND pe.estado = 'ACTIVO'
        AND e.estado = 'ACTIVA'
      ORDER BY e.nombre
    `, [id_personal]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error estaciones asignadas' });
  }
});

router.get('/cabinas', verificarToken, async (req, res) => {
  const { estacion } = req.query;
  if (!estacion) return res.status(400).json({ success: false, message: 'Falta ?estacion' });

  try {
    const [rows] = await db.query(`
      SELECT id_cabina, codigo, estado 
      FROM cabinas 
      WHERE id_estacion = ? 
        AND estado IN ('EN_SERVICIO', 'MANTENIMIENTO')
      ORDER BY codigo
    `, [estacion]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error cabinas' });
  }
});

router.post('/', verificarToken, async (req, res) => {
  const { titulo, tipo, nivel_criticidad, descripcion, id_estacion, id_cabina } = req.body;

  if (!titulo || !tipo || !nivel_criticidad || !descripcion) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
  }

  const id_reportado_por = req.user.id_personal || req.user.id;

  try {
    const [result] = await db.query(`
      INSERT INTO incidentes 
      (titulo, tipo, nivel_criticidad, descripcion, estado, 
       id_estacion, id_cabina, id_reportado_por, fecha_reporte)
      VALUES (?, ?, ?, ?, 'ABIERTO', ?, ?, ?, NOW())
    `, [
      titulo.trim(),
      tipo,
      nivel_criticidad,
      descripcion.trim(),
      id_estacion || null,
      id_cabina || null,
      id_reportado_por
    ]);

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Incidente registrado correctamente'
    });
  } catch (err) {
    console.error('Error crear incidente:', err);
    res.status(500).json({ success: false, message: 'Error al registrar incidente' });
  }
});

module.exports = router;