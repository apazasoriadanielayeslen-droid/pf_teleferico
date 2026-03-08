const pool = require('../config/conexion');

// Obtiene información de mantenimientos para el supervisor actual
exports.getSummary = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });

  try {
    // estaciones del supervisor
    const [stations] = await pool.query(
      `SELECT id_estacion FROM personal_estacion WHERE id_personal = ? AND estado = 'ACTIVO'`,
      [userId]
    );
    const ids = stations.map(s => s.id_estacion);
    if (ids.length === 0) {
      return res.json({ total:0, pendientes:0, enProceso:0, completadosHoy:0, proximos:[] });
    }
    const placeholders = ids.map(() => '?').join(',');

    const [totalRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE id_estacion IN (${placeholders})`,
      ids
    );
    const [pendRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE estado='PENDIENTE' AND id_estacion IN (${placeholders})`,
      ids
    );
    const [enProcRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE estado='EN_PROCESO' AND id_estacion IN (${placeholders})`,
      ids
    );
    const [compHoyRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE estado='FINALIZADO' AND DATE(fecha_actualizacion)=CURDATE() AND id_estacion IN (${placeholders})`,
      ids
    );
    // proximos: próximos mantenimientos en proceso ordenados recientes
    const [proxRows] = await pool.query(
      `SELECT id_mantenimiento, titulo_mantenimiento, tipo, descripcion, id_estacion, id_cabina, fecha_programada
       FROM mantenimientos
       WHERE estado='EN_PROCESO' AND id_estacion IN (${placeholders})
       ORDER BY fecha_programada DESC
       LIMIT 5`,
      ids
    );

    // incidentes proximos en proceso (para llenar vista inicial)
    const [incProx] = await pool.query(
      `SELECT i.id_incidente, i.titulo, i.id_estacion, e.nombre AS estacion_nombre, i.id_cabina, c.codigo AS cabina_codigo, i.tipo, i.nivel_criticidad, i.fecha_reporte
       FROM incidentes i
       LEFT JOIN estaciones e ON e.id_estacion = i.id_estacion
       LEFT JOIN cabinas c ON c.id_cabina = i.id_cabina
       WHERE i.estado IN ('EN_PROCESO','ABIERTO') AND i.id_estacion IN (${placeholders})
       AND i.id_incidente NOT IN (SELECT id_incidente FROM mantenimientos WHERE id_incidente IS NOT NULL)
       ORDER BY i.fecha_reporte DESC
       LIMIT 5`,
      ids
    );

    res.json({
      total: totalRow[0].total,
      pendientes: pendRow[0].total,
      enProceso: enProcRow[0].total,
      completadosHoy: compHoyRow[0].total,
      proximos: incProx // return incidents list
    });
  } catch (err) {
    console.error('Error resumen mantenimientos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// lista con filtros
exports.list = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });

  const { estado, from, to, search } = req.query;

  try {
    const [stations] = await pool.query(
      `SELECT id_estacion FROM personal_estacion WHERE id_personal = ? AND estado = 'ACTIVO'`,
      [userId]
    );
    const ids = stations.map(s => s.id_estacion);
    if (ids.length === 0) return res.json([]);
    const placeholders = ids.map(() => '?').join(',');

    let sql = `SELECT m.*, e.nombre AS estacion_nombre, c.codigo AS cabina_codigo
               FROM mantenimientos m
               LEFT JOIN estaciones e ON e.id_estacion = m.id_estacion
               LEFT JOIN cabinas c ON c.id_cabina = m.id_cabina
               WHERE m.id_estacion IN (${placeholders})`;
    const params = [...ids];

    if (estado) {
      sql += ' AND m.estado = ?';
      params.push(estado);
    }
    if (search) {
      sql += ' AND (m.descripcion LIKE ? OR e.nombre LIKE ? OR c.codigo LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (from) {
      sql += ' AND m.fecha_programada >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND m.fecha_programada <= ?';
      params.push(to);
    }

    sql += ' ORDER BY m.fecha_programada DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error list mantenimientos:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// crear mantenimiento
exports.getTechnicians = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_personal, CONCAT(nombres, ' ', apellido1, ' ', apellido2) AS nombre
       FROM personal
       WHERE id_rol = (SELECT id_rol FROM roles WHERE nombre = 'TECNICO')
         AND estado = 'ACTIVO'`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo técnicos:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

exports.getCabinaByCode = async (req, res) => {
  const code = req.params.code;
  if (!code) return res.status(400).json({ message: 'Falta código' });
  try {
    const [rows] = await pool.query(
      'SELECT id_cabina FROM cabinas WHERE codigo = ?', [code]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error buscando cabina:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

exports.create = async (req, res) => {
  const userId = req.user?.id;
  console.log('req.body en create:', req.body);
  console.log('typeof req.body:', typeof req.body);
  const { titulo, tipo, id_estacion, id_cabina, descripcion, fecha_programada, hora_programada, id_responsable, id_incidente } = req.body;

  if (!titulo || !tipo || (!id_estacion && !id_cabina) || !descripcion || !fecha_programada || !hora_programada) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  const fechaHora = `${fecha_programada} ${hora_programada}:00`;

  try {
    const [result] = await pool.query(
      `INSERT INTO mantenimientos (titulo_mantenimiento, tipo, descripcion, fecha_programada, estado, id_estacion, id_cabina, id_responsable, id_incidente)
       VALUES (?, ?, ?, ?, 'EN_PROCESO', ?, ?, ?, ?)`,
      [titulo, tipo, descripcion, fechaHora, id_estacion || null, id_cabina || null, id_responsable || null, id_incidente || null]
    );

    console.log('Mantenimiento creado con id:', result.insertId, 'id_incidente:', id_incidente);

    // Si hay cabina, cambiar estado a MANTENIMIENTO
    if (id_cabina) {
      await pool.query('UPDATE cabinas SET estado = ? WHERE id_cabina = ?', ['MANTENIMIENTO', id_cabina]);
    }

    // Si hay incidente, marcar como en proceso
    if (id_incidente) {
      await pool.query('UPDATE incidentes SET estado = ? WHERE id_incidente = ?', ['EN_PROCESO', id_incidente]);
    }

    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error crear mantenimiento:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// obtener detalles de un incidente
exports.getIncidentDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT i.*, e.nombre AS estacion_nombre, c.codigo AS cabina_codigo
       FROM incidentes i
       LEFT JOIN estaciones e ON e.id_estacion = i.id_estacion
       LEFT JOIN cabinas c ON c.id_cabina = i.id_cabina
       WHERE i.id_incidente = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Incidente no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo detalle incidente:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// editar mantenimiento
exports.update = async (req, res) => {
  const { id } = req.params;
  const { titulo, tipo, id_estacion, id_cabina, descripcion, fecha_programada, hora_programada, id_responsable, estado } = req.body;

  try {
    const fechaHora = fecha_programada && hora_programada ? `${fecha_programada} ${hora_programada}:00` : null;
    const [result] = await pool.query(
      `UPDATE mantenimientos SET titulo_mantenimiento = ?, tipo = ?, descripcion = ?, fecha_programada = COALESCE(?, fecha_programada), id_estacion = ?, id_cabina = ?, id_responsable = ?, estado = ?
       WHERE id_mantenimiento = ?`,
      [titulo, tipo, descripcion, fechaHora, id_estacion || null, id_cabina || null, id_responsable || null, estado, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error actualizando mantenimiento:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// obtener un mantenimiento por id
exports.getById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT m.*, e.nombre AS estacion_nombre, c.codigo AS cabina_codigo
       FROM mantenimientos m
       LEFT JOIN estaciones e ON e.id_estacion = m.id_estacion
       LEFT JOIN cabinas c ON c.id_cabina = m.id_cabina
       WHERE m.id_mantenimiento = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo mantenimiento:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// obtener el último incidente de una cabina por código
exports.getLastIncidentByCabina = async (req, res) => {
  const { codigo } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT i.*, e.nombre AS estacion_nombre
       FROM incidentes i
       LEFT JOIN estaciones e ON e.id_estacion = i.id_estacion
       WHERE i.id_cabina = (SELECT id_cabina FROM cabinas WHERE codigo = ?)
       ORDER BY i.fecha_reporte DESC
       LIMIT 1`,
      [codigo]
    );
    if (rows.length === 0) {
      return res.json(null);
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo último incidente de cabina:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};
