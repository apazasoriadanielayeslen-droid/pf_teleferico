const db = require('../config/conexion');

// Crear telestación (usa tabla estaciones)
exports.crearTelestacion = async (req, res) => {
  const { nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, encargados } = req.body;
  try {
    // Validar entrada
    if (!nombre || !ubicacion || !capacidad_maxima) {
      return res.status(400).json({ success: false, message: "Campos requeridos: nombre, ubicacion, capacidad_maxima" });
    }
    if (capacidad_maxima <= 0) {
      return res.status(400).json({ success: false, message: "capacidad_maxima debe ser mayor a 0" });
    }
    
    console.log("📍 Creando telestación:", { nombre, ubicacion, capacidad_maxima });
    const [result] = await db.query(`
      INSERT INTO estaciones (nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado || 'ACTIVO']
    );

    const id_estacion = result.insertId;

    if (Array.isArray(encargados) && encargados.length > 0) {
      for (const enc of encargados) {
        if (!enc.id_personal || !enc.turno) {
          console.warn("⚠️ Encargado incompleto:", enc);
          continue;
        }
        await db.query(`
          INSERT INTO personal_estacion (id_personal, id_estacion, turno, estado)
          VALUES (?, ?, ?, 'ACTIVO')
          ON DUPLICATE KEY UPDATE turno = VALUES(turno), estado = 'ACTIVO'`,
          [enc.id_personal, id_estacion, enc.turno]
        );
      }
    }

    console.log(`✓ Telestación creada: ID ${id_estacion}`);
    res.json({ success: true, message: "Telestación creada correctamente", id_estacion });
  } catch (error) {
    console.error("❌ Error al crear telestación:", error.sqlMessage || error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ success: false, message: "Error al crear telestación", error: error.sqlMessage || error.message });
  }
};

// Obtener telestación por ID
exports.getTelestacionById = async (req, res) => {
  const { id } = req.params;
  try {
    console.log("📍 Obteniendo telestación por ID:", id);
    const [rows] = await db.query(`
      SELECT e.id_estacion, e.nombre, e.ubicacion, e.capacidad_maxima,
             e.hora_apertura, e.hora_cierre, e.estado,
             CONCAT(e.hora_apertura, ' - ', e.hora_cierre) AS horario,
             GROUP_CONCAT(CONCAT(p.nombres, ' ', p.apellido1, ' (', pe.turno, ')') SEPARATOR ', ') AS encargados
      FROM estaciones e
      LEFT JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion AND pe.estado = 'ACTIVO'
      LEFT JOIN personal p ON pe.id_personal = p.id_personal
      WHERE e.id_estacion = ?
      GROUP BY e.id_estacion`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, message: "Telestación no encontrada" });

    console.log(`✓ Telestación encontrada: ${rows[0].nombre}`);
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener telestación:", error.sqlMessage || error.message);
    res.status(500).json({ success: false, message: "Error al obtener telestación", error: error.sqlMessage || error.message });
  }
};

// Listar telestaciones
exports.getTelestaciones = async (req, res) => {
  try {
    // Log de debug
    console.log("📋 Obteniendo telestaciones...");
    console.log("👤 Usuario autenticado:", req.user);
    
    const [rows] = await db.query(`
      SELECT e.id_estacion, e.nombre, e.ubicacion, e.capacidad_maxima,
             e.hora_apertura, e.hora_cierre, e.estado,
             CONCAT(e.hora_apertura, ' - ', e.hora_cierre) AS horario,
             GROUP_CONCAT(CONCAT(p.nombres, ' ', p.apellido1, ' (', pe.turno, ')') SEPARATOR ', ') AS encargados
      FROM estaciones e
      LEFT JOIN personal_estacion pe ON e.id_estacion = pe.id_estacion AND pe.estado = 'ACTIVO'
      LEFT JOIN personal p ON pe.id_personal = p.id_personal
      GROUP BY e.id_estacion
      ORDER BY e.id_estacion DESC`
    );
    
    console.log(`✓ Se encontraron ${rows.length} telestaciones`);
    res.json(rows);
  } catch (error) {
    console.error("❌ Error al obtener telestaciones:", error.sqlMessage || error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ success: false, message: "Error al obtener telestaciones", error: error.sqlMessage || error.message });
  }
};

// Editar telestación
exports.editarTelestacion = async (req, res) => {
  const { id } = req.params;
  const { nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, encargados } = req.body;
  try {
    // Validar entrada
    if (!nombre || !ubicacion || !capacidad_maxima) {
      return res.status(400).json({ success: false, message: "Campos requeridos: nombre, ubicacion, capacidad_maxima" });
    }
    if (capacidad_maxima <= 0) {
      return res.status(400).json({ success: false, message: "capacidad_maxima debe ser mayor a 0" });
    }
    
    console.log("📝 Editando telestación ID:", id);
    await db.query(`
      UPDATE estaciones
      SET nombre=?, ubicacion=?, capacidad_maxima=?, hora_apertura=?, hora_cierre=?, estado=?
      WHERE id_estacion=?`,
      [nombre, ubicacion, capacidad_maxima, hora_apertura, hora_cierre, estado, id]
    );

    if (Array.isArray(encargados)) {
      await db.query(`UPDATE personal_estacion SET estado='INACTIVO' WHERE id_estacion=?`, [id]);
      for (const enc of encargados) {
        await db.query(`
          INSERT INTO personal_estacion (id_personal, id_estacion, turno, estado)
          VALUES (?, ?, ?, 'ACTIVO')
          ON DUPLICATE KEY UPDATE turno = VALUES(turno), estado = 'ACTIVO'`,
          [enc.id_personal, id, enc.turno]
        );
      }
    }

    res.json({ success: true, message: "Telestación actualizada correctamente" });
  } catch (error) {
    console.error("Error al editar telestación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al editar telestación" });
  }
};

// Eliminar telestación (marcar INACTIVA)
exports.eliminarTelestacion = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE estaciones SET estado='INACTIVO' WHERE id_estacion=?`, [id]);
    console.log(`✓ Telestación ${id} marcada como INACTIVO`);
    res.json({ success: true, message: "Telestación eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar telestación:", error.sqlMessage || error);
    res.status(500).json({ message: "Error al eliminar telestación" });
  }
};