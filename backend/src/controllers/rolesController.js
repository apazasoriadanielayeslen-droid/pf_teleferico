const pool = require('../config/conexion');

// GET /api/roles
exports.getRoles = async (req, res) => {
  try {
    // Selecciona todos los roles con fecha de registro y orden descendente
    const [roles] = await pool.query(`
      SELECT id_rol, nombre, descripcion, fecha_registro
      FROM roles
      ORDER BY id_rol DESC
    `);

    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

// POST /api/roles
exports.createRol = async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );

    res.status(201).json({
      success: true,
      message: 'Rol creado correctamente',
      id_rol: result.insertId
    });
  } catch (error) {
    console.error('Error al crear rol:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ message: 'El nombre del rol ya existe' });
    } else {
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
};

// PUT /api/roles/:id
exports.updateRol = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
  }

  try {
    await pool.query(
      'UPDATE roles SET nombre=?, descripcion=? WHERE id_rol=?',
      [nombre, descripcion, id]
    );
    res.json({ success: true, message: 'Rol actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

// DELETE /api/roles/:id
exports.deleteRol = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM roles WHERE id_rol=?', [id]);
    res.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({ message: 'Error al eliminar rol' });
  }
};