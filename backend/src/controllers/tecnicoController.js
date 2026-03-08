const pool = require('../config/conexion');

// Obtener resumen para el dashboard del técnico
exports.getOverview = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });

  try {
    // Mantenimientos en proceso a cargo del técnico
    const [enProceso] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE id_responsable = ? AND estado = 'EN_PROCESO'`,
      [userId]
    );

    // Mantenimientos preventivos a cargo
    const [preventivos] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE id_responsable = ? AND tipo = 'PREVENTIVO'`,
      [userId]
    );

    // Mantenimientos correctivos a cargo
    const [correctivos] = await pool.query(
      `SELECT COUNT(*) AS total FROM mantenimientos WHERE id_responsable = ? AND tipo = 'CORRECTIVO'`,
      [userId]
    );

    res.json({
      nombre: req.user.nombre,
      rol: req.user.rol,
      mantenimientosEnProceso: enProceso[0].total,
      mantenimientosPreventivos: preventivos[0].total,
      mantenimientosCorrectivos: correctivos[0].total
    });
  } catch (err) {
    console.error('Error obteniendo overview técnico:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Listar mantenimientos del técnico con filtros
exports.getMantenimientos = async (req, res) => {
  const userId = req.user?.id;
  const { estado, tipo } = req.query;

  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });

  try {
    let sql = `SELECT m.*, e.nombre AS estacion_nombre, e.ubicacion, c.codigo AS cabina_codigo
               FROM mantenimientos m
               LEFT JOIN estaciones e ON m.id_estacion = e.id_estacion
               LEFT JOIN cabinas c ON m.id_cabina = c.id_cabina
               WHERE m.id_responsable = ?`;
    const params = [userId];

    if (estado) {
      sql += ' AND m.estado = ?';
      params.push(estado);
    }
    if (tipo) {
      sql += ' AND m.tipo = ?';
      params.push(tipo);
    }

    sql += ' ORDER BY m.fecha_programada DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo mantenimientos técnico:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Obtener detalle de un mantenimiento
exports.getMantenimientoDetalle = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const [rows] = await pool.query(
      `SELECT m.*, e.nombre AS estacion_nombre, e.ubicacion, c.codigo AS cabina_codigo
       FROM mantenimientos m
       LEFT JOIN estaciones e ON m.id_estacion = e.id_estacion
       LEFT JOIN cabinas c ON m.id_cabina = c.id_cabina
       WHERE m.id_mantenimiento = ? AND m.id_responsable = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo detalle mantenimiento:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Finalizar mantenimiento
exports.finalizarMantenimiento = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // Verificar que el mantenimiento pertenece al técnico
    const [maint] = await pool.query(
      'SELECT id_incidente FROM mantenimientos WHERE id_mantenimiento = ? AND id_responsable = ?',
      [id, userId]
    );

    if (maint.length === 0) {
      return res.status(404).json({ message: 'Mantenimiento no encontrado' });
    }

    const fechaRealizada = new Date();

    // Actualizar mantenimiento
    await pool.query(
      'UPDATE mantenimientos SET estado = ?, fecha_realizada = ? WHERE id_mantenimiento = ?',
      ['FINALIZADO', fechaRealizada, id]
    );

    // Actualizar incidente si existe
    if (maint[0].id_incidente) {
      await pool.query(
        'UPDATE incidentes SET estado = ? WHERE id_incidente = ?',
        ['RESUELTO', maint[0].id_incidente]
      );
    }

    res.json({ success: true, fechaRealizada });
  } catch (err) {
    console.error('Error finalizando mantenimiento:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Enviar notificación de finalización
exports.enviarNotificacion = async (req, res) => {
  const userId = req.user?.id;
  const { titulo, mensaje, tipo, id_incidente } = req.body;

  if (!titulo || !mensaje || !tipo) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
    // Obtener id_personal del supervisor (asumiendo que hay un supervisor asignado a la estación)
    // Para simplificar, enviar a todos los supervisores de la estación del incidente
    let supervisorIds = [];
    if (id_incidente) {
      const [inc] = await pool.query('SELECT id_estacion FROM incidentes WHERE id_incidente = ?', [id_incidente]);
      if (inc.length > 0) {
        const [sups] = await pool.query(
          `SELECT DISTINCT pe.id_personal FROM personal_estacion pe
           JOIN personal p ON pe.id_personal = p.id_personal
           WHERE pe.id_estacion = ? AND p.id_rol = (SELECT id_rol FROM roles WHERE nombre = 'SUPERVISOR')`,
          [inc[0].id_estacion]
        );
        supervisorIds = sups.map(s => s.id_personal);
      }
    }

    // Si no hay supervisores específicos, enviar a todos los supervisores (opcional)
    if (supervisorIds.length === 0) {
      const [allSups] = await pool.query(
        `SELECT id_personal FROM personal WHERE id_rol = (SELECT id_rol FROM roles WHERE nombre = 'SUPERVISOR')`
      );
      supervisorIds = allSups.map(s => s.id_personal);
    }

    // Insertar notificaciones para cada supervisor
    for (const supId of supervisorIds) {
      await pool.query(
        `INSERT INTO notificaciones (id_personal, titulo, mensaje, tipo, estado, leido, id_incidente)
         VALUES (?, ?, ?, ?, 'ENVIADO', 0, ?)`,
        [supId, titulo, mensaje, tipo, id_incidente]
      );
    }

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error enviando notificación:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};