// src/routes/incidentes.js

const express = require('express');
const router = express.Router();
const db = require('../config/conexion');
const { verificarToken } = require('../middlewares/mauth');

// ════════════════════════════════════════════════
// GET /api/incidentes/resumen
// GET /api/incidentes/resumen?estacion=123
// ════════════════════════════════════════════════
router.get('/resumen', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;
  const { estacion } = req.query;

  try {
    const [asignadas] = await db.query(`
      SELECT id_estacion 
      FROM personal_estacion 
      WHERE id_personal = ? AND estado = 'ACTIVO'
    `, [id_personal]);

    if (asignadas.length === 0) {
      return res.json({ total: 0, abiertos: 0, en_proceso: 0, resueltos: 0 });
    }

    let idsEstaciones = asignadas.map(e => e.id_estacion);

    if (estacion) {
      const idEst = Number(estacion);
      if (isNaN(idEst) || !idsEstaciones.includes(idEst)) {
        return res.json({ total: 0, abiertos: 0, en_proceso: 0, resueltos: 0 });
      }
      idsEstaciones = [idEst];
    }

    const placeholders = idsEstaciones.map(() => '?').join(',');
    const [counts] = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'ABIERTO'     THEN 1 ELSE 0 END) AS abiertos,
        SUM(CASE WHEN estado = 'EN_PROCESO'  THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'RESUELTO'    THEN 1 ELSE 0 END) AS resueltos
      FROM incidentes
      WHERE id_estacion IN (${placeholders})
    `, idsEstaciones);

    res.json(counts[0] || { total: 0, abiertos: 0, en_proceso: 0, resueltos: 0 });
  } catch (err) {
    console.error('Error en /resumen:', err);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
});

// ════════════════════════════════════════════════
// GET /api/incidentes/recientes
// GET /api/incidentes/recientes?estacion=123
// ════════════════════════════════════════════════
router.get('/recientes', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;
  const { estacion } = req.query;

  try {
    const [asignadas] = await db.query(`
      SELECT id_estacion 
      FROM personal_estacion 
      WHERE id_personal = ? AND estado = 'ACTIVO'
    `, [id_personal]);

    if (asignadas.length === 0) return res.json([]);

    let idsEstaciones = asignadas.map(e => e.id_estacion);

    if (estacion) {
      const idEst = Number(estacion);
      if (isNaN(idEst) || !idsEstaciones.includes(idEst)) return res.json([]);
      idsEstaciones = [idEst];
    }

    const placeholders = idsEstaciones.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT 
        i.id_incidente,
        i.titulo,
        i.descripcion,
        i.tipo,
        i.estado,
        i.nivel_criticidad,
        i.fecha_reporte,
        e.nombre AS estacion,
        CONCAT(p.nombres, ' ', p.apellido1) AS reportado_por
      FROM incidentes i
      LEFT JOIN estaciones e ON i.id_estacion = e.id_estacion
      LEFT JOIN personal p   ON i.id_reportado_por = p.id_personal
      WHERE i.id_estacion IN (${placeholders})
        AND i.estado IN ('ABIERTO', 'EN_PROCESO')
      ORDER BY i.fecha_reporte DESC
      LIMIT 10
    `, idsEstaciones);

    res.json(rows);
  } catch (err) {
    console.error('Error en /recientes:', err);
    res.status(500).json({ success: false, message: 'Error al obtener incidentes recientes' });
  }
});

// ════════════════════════════════════════════════
// GET /api/incidentes/estaciones/asignadas
// ════════════════════════════════════════════════
router.get('/estaciones/asignadas', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT e.id_estacion, e.nombre
      FROM estaciones e
      INNER JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion
      WHERE pe.id_personal = ? 
        AND pe.estado = 'ACTIVO'
        AND e.estado   = 'ACTIVA'
      ORDER BY e.nombre
    `, [id_personal]);
    res.json(rows);
  } catch (err) {
    console.error('Error estaciones asignadas:', err);
    res.status(500).json({ success: false, message: 'Error estaciones asignadas' });
  }
});

// ════════════════════════════════════════════════
// GET /api/incidentes/cabinas?estacion=123
// ════════════════════════════════════════════════
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
    console.error('Error cabinas:', err);
    res.status(500).json({ success: false, message: 'Error cabinas' });
  }
});

// ════════════════════════════════════════════════
// POST /api/incidentes
// Crea incidente y si tiene cabina → guarda en eventos_cabina
// ════════════════════════════════════════════════
// ════════════════════════════════════════════════
// POST /api/incidentes
// Crea incidente + evento_cabina (si tiene cabina) + notificación
// ════════════════════════════════════════════════
router.post('/', verificarToken, async (req, res) => {
  const { titulo, tipo, nivel_criticidad, descripcion, id_estacion, id_cabina } = req.body;

  if (!titulo || !tipo || !nivel_criticidad || !descripcion) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
  }

  const id_reportado_por = req.user.id_personal || req.user.id;

  try {
    // 1. Insertar el incidente
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
      id_cabina   || null,
      id_reportado_por
    ]);

    const id_incidente = result.insertId;

    // 2. Si se seleccionó una cabina → registrar en eventos_cabina
    if (id_cabina) {
      await db.query(`
        INSERT INTO eventos_cabina (id_cabina, descripcion)
        VALUES (?, ?)
      `, [
        id_cabina,
        `Incidente #${id_incidente} registrado: [${tipo}] ${titulo.trim()} — Criticidad: ${nivel_criticidad}`
      ]);
    }

    // 3. Insertar notificación para el operador que lo reportó
    await db.query(`
      INSERT INTO notificaciones 
      (id_personal, titulo, mensaje, tipo, estado, leido, id_incidente)
      VALUES (?, ?, ?, 'INCIDENTE', 'PENDIENTE', FALSE, ?)
    `, [
      id_reportado_por,
      `Incidente ${tipo} reportado: ${titulo.trim()}`,
      `Se registró un incidente de tipo ${tipo} con criticidad ${nivel_criticidad}. Estado: ABIERTO.`,
      id_incidente
    ]);

    res.status(201).json({
      success: true,
      id: id_incidente,
      message: 'Incidente registrado correctamente'
    });

  } catch (err) {
    console.error('Error crear incidente:', err);
    res.status(500).json({ success: false, message: 'Error al registrar incidente' });
  }
});
// ════════════════════════════════════════════════
// PATCH /api/incidentes/:id/resolver
// Solo OPERADOR puede resolver incidentes OPERATIVOS
// También cierra la notificación asociada si existe
// ════════════════════════════════════════════════
router.patch('/:id/resolver', verificarToken, async (req, res) => {
  const id_incidente = Number(req.params.id);
  const rol = req.user.rol;

  if (rol !== 'OPERADOR') {
    return res.status(403).json({ success: false, message: 'Solo operadores pueden resolver incidentes' });
  }

  try {
    const [rows] = await db.query(
      `SELECT tipo, estado FROM incidentes WHERE id_incidente = ?`,
      [id_incidente]
    );

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Incidente no encontrado' });

    if (rows[0].tipo !== 'OPERATIVO')
      return res.status(403).json({ success: false, message: 'Solo se pueden resolver incidentes OPERATIVOS' });

    if (rows[0].estado === 'RESUELTO')
      return res.status(400).json({ success: false, message: 'El incidente ya está resuelto' });

    // 1. Actualizar el incidente
    await db.query(
      `UPDATE incidentes 
       SET estado = 'RESUELTO', fecha_actualizacion = NOW() 
       WHERE id_incidente = ?`,
      [id_incidente]
    );

    // 2. Cerrar la notificación asociada si existe
    await db.query(
      `UPDATE notificaciones
       SET estado = 'RECIBIDO', leido = TRUE
       WHERE id_incidente = ? AND tipo = 'CONGESTION' AND estado = 'PENDIENTE'`,
      [id_incidente]
    );

    res.json({ success: true, message: 'Incidente resuelto correctamente' });
  } catch (err) {
    console.error('Error al resolver:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});



// GET /api/notificaciones/todas — CONGESTION + INCIDENTE pendientes
router.get('/notificaciones/todas', verificarToken, async (req, res) => {
  const id_personal = req.user.id_personal || req.user.id;
  try {
    const [rows] = await db.query(`
      SELECT 
        n.id_notificacion,
        n.id_incidente,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.fecha,
        n.estado,
        e.nombre AS estacion
      FROM notificaciones n
      LEFT JOIN incidentes i ON n.id_incidente = i.id_incidente
      LEFT JOIN estaciones e ON i.id_estacion  = e.id_estacion
      WHERE n.id_personal = ?
        AND n.leido  = FALSE
        AND n.estado = 'PENDIENTE'
        AND n.tipo IN ('CONGESTION', 'INCIDENTE')
      ORDER BY n.fecha DESC
    `, [id_personal]);
    res.json(rows);
  } catch (err) {
    console.error('Error notificaciones/todas:', err);
    res.status(500).json({ ok: false, message: 'Error al consultar notificaciones' });
  }
});
module.exports = router;