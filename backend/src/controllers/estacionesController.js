const db = require('../config/conexion');

// Crear estación (con opción de asignar encargados)
exports.crearEstacion = async (req, res) => {
  const { nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, encargados } = req.body;
  try {
    const [result] = await db.query(`
      INSERT INTO estaciones (nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado]);

    const id_estacion = result.insertId;

    if (Array.isArray(encargados)) {
      for (const enc of encargados) {
        await db.query(`
          INSERT INTO personal_estacion (id_personal, id_estacion, turno, estado)
          VALUES (?, ?, ?, 'ACTIVO')
          ON DUPLICATE KEY UPDATE turno = VALUES(turno), estado = 'ACTIVO'
        `, [enc.id_personal, id_estacion, enc.turno]);
      }
    }

    res.json({ success: true, message: "Estación creada correctamente", id_estacion });
  } catch (error) {
    console.error("Error al crear estación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al crear estación" });
  }
};

// Obtener una estación por ID
exports.getEstacionById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`
      SELECT e.id_estacion, e.nombre, e.ubicacion, e.capacidad_maxima,
             e.hora_apertura, e.hora_cierre, e.estado,
             CONCAT(e.hora_apertura, ' - ', e.hora_cierre) AS horario,
             GROUP_CONCAT(CONCAT(p.nombres, ' ', p.apellido1, ' (', pe.turno, ')') SEPARATOR ', ') AS encargados
      FROM estaciones e
      LEFT JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion AND pe.estado = 'ACTIVO'
      LEFT JOIN personal p ON pe.id_personal = p.id_personal
      WHERE e.id_estacion = ?
      GROUP BY e.id_estacion
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Estación no encontrada" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener estación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al obtener estación" });
  }
};

// Listar estaciones
exports.getEstaciones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id_estacion, e.nombre, e.ubicacion, e.capacidad_maxima,
             e.hora_apertura, e.hora_cierre, e.estado,
             CONCAT(e.hora_apertura, ' - ', e.hora_cierre) AS horario,
             GROUP_CONCAT(CONCAT(p.nombres, ' ', p.apellido1, ' (', pe.turno, ')') SEPARATOR ', ') AS encargados
      FROM estaciones e
      LEFT JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion AND pe.estado = 'ACTIVO'
      LEFT JOIN personal p ON pe.id_personal = p.id_personal
      GROUP BY e.id_estacion
      ORDER BY e.id_estacion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener estaciones:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al obtener estaciones" });
  }
};

// Editar estación
exports.editarEstacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, encargados } = req.body;
  try {
    await db.query(`
      UPDATE estaciones
      SET nombre=?, ubicacion=?, capacidad_maxima=?, hora_apertura=?, hora_cierre=?, estado=?
      WHERE id_estacion=?
    `, [nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, id]);

    if (Array.isArray(encargados)) {
      await db.query(`UPDATE personal_estacion SET estado='INACTIVO' WHERE id_estacion=?`, [id]);
      for (const enc of encargados) {
        await db.query(`
          INSERT INTO personal_estacion (id_personal, id_estacion, turno, estado)
          VALUES (?, ?, ?, 'ACTIVO')
          ON DUPLICATE KEY UPDATE turno = VALUES(turno), estado = 'ACTIVO'
        `, [enc.id_personal, id, enc.turno]);
      }
    }

    res.json({ success: true, message: "Estación actualizada correctamente" });
  } catch (error) {
    console.error("Error al editar estación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al editar estación" });
  }
};

// Eliminar estación
exports.eliminarEstacion = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE estaciones SET estado='INACTIVA' WHERE id_estacion=?`, [id]);
    res.json({ success: true, message: "Estación eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar estación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al eliminar estación" });
  }
};