const pool = require('../config/conexion');

// Devuelve un resumen para el dashboard de un supervisor.
exports.getOverview = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(400).json({ message: 'Usuario no identificado' });
  }

  try {
    // 1. estaciones supervisadas (activas/inactivas)
    const [stations] = await pool.query(
      `SELECT e.id_estacion, e.nombre, e.ubicacion, e.estado
       FROM estaciones e
       JOIN personal_estacion pe ON pe.id_estacion = e.id_estacion
       WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'`,
      [userId]
    );

    const stationIds = stations.map(s => s.id_estacion);

    let cabinasCount = 0;
    let alertasProceso = 0;
    let incidentesActivos = 0;
    let recientes = [];

    if (stationIds.length > 0) {
      const placeholders = stationIds.map(() => '?').join(',');

      const [cabs] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM cabinas
         WHERE estado = 'EN_SERVICIO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      cabinasCount = cabs[0].total;

      const [enProceso] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM incidentes
         WHERE estado = 'EN_PROCESO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      alertasProceso = enProceso[0].total;

      const [abiertos] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM incidentes
         WHERE estado = 'ABIERTO' AND id_estacion IN (${placeholders})`,
        stationIds
      );
      incidentesActivos = abiertos[0].total;

      // Filtros para recientes
      const { fecha, nivel, tipo, estado, orden } = req.query;
      let whereClause = `i.id_estacion IN (${placeholders})`;
      const params = [...stationIds];

      if (fecha) {
        whereClause += ' AND DATE(i.fecha_reporte) = ?';
        params.push(fecha);
      }
      if (nivel) {
        whereClause += ' AND i.nivel_criticidad = ?';
        params.push(nivel);
      }
      if (tipo) {
        whereClause += ' AND i.tipo = ?';
        params.push(tipo);
      }
      if (estado) {
        whereClause += ' AND i.estado = ?';
        params.push(estado);
      }

      const orderBy = orden === 'asc' ? 'ASC' : 'DESC';

      const [recentRows] = await pool.query(
        `SELECT i.id_incidente, i.titulo, i.tipo, i.nivel_criticidad, i.estado,
                i.id_estacion, i.id_cabina, e.nombre AS estacion_nombre, i.fecha_reporte
         FROM incidentes i
         LEFT JOIN estaciones e ON e.id_estacion = i.id_estacion
         WHERE ${whereClause}
         ORDER BY i.fecha_reporte ${orderBy}
         LIMIT 5`,
        params
      );
      recientes = recentRows;
    }

    res.json({
      nombre: req.user.nombre,
      rol: req.user.rol,
      estaciones: stations,
      cabinasEnRuta: cabinasCount,
      alertasEnProceso: alertasProceso,
      incidentesActivos: incidentesActivos,
      recientes: recientes
    });
  } catch (error) {
    console.error('Error obteniendo overview supervisor:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// estaciones activas asignadas al supervisor
exports.getStations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });
  try {
    const [rows] = await pool.query(
      `SELECT e.id_estacion, e.nombre, e.ubicacion FROM estaciones e
       JOIN personal_estacion pe ON pe.id_estacion = e.id_estacion
       WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo estaciones supervisor:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// cabinas asignadas al supervisor
exports.getCabinas = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });
  try {
    const [rows] = await pool.query(
      `SELECT c.id_cabina, c.codigo, c.estado, c.id_estacion, e.nombre AS estacion_nombre
       FROM cabinas c
       JOIN estaciones e ON e.id_estacion = c.id_estacion
       JOIN personal_estacion pe ON pe.id_estacion = e.id_estacion
       WHERE pe.id_personal = ? AND pe.estado = 'ACTIVO'`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo cabinas supervisor:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// notificaciones para el supervisor (de personal operativo en sus estaciones)
exports.getNotifications = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });
  try {
    // estaciones del supervisor
    const [stations] = await pool.query(
      `SELECT id_estacion FROM personal_estacion WHERE id_personal = ? AND estado = 'ACTIVO'`,
      [userId]
    );
    const ids = stations.map(s => s.id_estacion);
    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');
    // personal en esas estaciones
    const [operativos] = await pool.query(
      `SELECT DISTINCT id_personal FROM personal_estacion WHERE id_estacion IN (${placeholders})`,
      ids
    );
    const opIds = operativos.map(o => o.id_personal);
    if (opIds.length === 0) return res.json([]);

    const opPlaceholders = opIds.map(() => '?').join(',');
    const [notifs] = await pool.query(
      `SELECT n.*, CONCAT(p.nombres, ' ', p.apellido1) AS nombre_personal, i.titulo AS titulo_incidente, i.descripcion AS detalle_incidente
       FROM notificaciones n
       JOIN personal p ON p.id_personal = n.id_personal
       LEFT JOIN incidentes i ON i.id_incidente = n.id_incidente
       WHERE (n.id_personal IN (${opPlaceholders}) OR n.id_personal = ?) AND n.estado = 'PENDIENTE' AND n.leido = 0
       ORDER BY n.fecha DESC`,
      [...opIds, userId]
    );

    res.json(notifs);
  } catch (err) {
    console.error('Error obteniendo notificaciones supervisor:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// Marcar notificaciones como leidas
exports.markNotificationsRead = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Usuario no identificado' });
  try {
    // estaciones del supervisor
    const [stations] = await pool.query(
      `SELECT id_estacion FROM personal_estacion WHERE id_personal = ? AND estado = 'ACTIVO'`,
      [userId]
    );
    const ids = stations.map(s => s.id_estacion);
    if (ids.length === 0) return res.json({ success: true });

    const placeholders = ids.map(() => '?').join(',');
    // personal operativo en esas estaciones
    const [operativos] = await pool.query(
      `SELECT DISTINCT id_personal FROM personal_estacion WHERE id_estacion IN (${placeholders})`,
      ids
    );
    const opIds = operativos.map(o => o.id_personal);
    if (opIds.length === 0) return res.json({ success: true });

    const opPlaceholders = opIds.map(() => '?').join(',');
    await pool.query(
      `UPDATE notificaciones SET leido = 1, estado = 'RECIBIDO' WHERE (id_personal IN (${opPlaceholders}) OR id_personal = ?) AND estado = 'PENDIENTE' AND leido = 0`,
      [...opIds, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error marcando notificaciones como leidas:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};
