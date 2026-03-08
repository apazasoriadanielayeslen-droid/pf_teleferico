const bcrypt = require('bcryptjs');   // ✅ importar bcrypt
const pool = require('../config/conexion');

// GET /api/roles
exports.getRoles = async (req, res) => {
  try {
    const [roles] = await pool.query(
      'SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol'
    );
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

// POST /api/registro
exports.register = async (req, res) => {
  const { nombres, apellido1, apellido2, ci, telefono, correo, contrasena, id_rol } = req.body;

  // Validaciones básicas
  if (!nombres || !apellido1 || !ci || !correo || !contrasena || !id_rol) {
    return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
  }
  if (contrasena.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  try {
    // Verificar si CI o correo ya existen
    const [existente] = await pool.query(
      'SELECT id_personal FROM personal WHERE ci = ? OR correo = ?',
      [ci, correo]
    );

    if (existente.length > 0) {
      return res.status(409).json({ message: 'El C.I. o el correo electrónico ya están registrados' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Insertar usuario
    const [result] = await pool.query(`
      INSERT INTO personal 
      (nombres, apellido1, apellido2, ci, id_rol, correo, telefono, contrasena, estado, fecha_contratacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', CURDATE())
    `, [nombres, apellido1, apellido2, ci, id_rol, correo, telefono, hashedPassword]);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      id_personal: result.insertId
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /api/registro/activos
exports.getUsuariosActivos = async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT p.id_personal, p.nombres, p.apellido1, p.apellido2, p.ci, p.correo, p.telefono,
             r.nombre AS rol, r.id_rol, p.estado
      FROM personal p
      JOIN roles r ON p.id_rol = r.id_rol
      WHERE p.estado = 'ACTIVO'
      ORDER BY p.id_personal DESC
    `);
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios activos' });
  }
};

// GET /api/registro/inactivos
exports.getUsuariosInactivos = async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT p.id_personal, p.nombres, p.apellido1, p.apellido2, p.ci, p.correo, p.telefono,
             r.nombre AS rol, r.id_rol, p.estado
      FROM personal p
      JOIN roles r ON p.id_rol = r.id_rol
      WHERE p.estado = 'INACTIVO'
      ORDER BY p.id_personal DESC
    `);
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener usuarios inactivos' });
  }
};

// PUT /api/registro/:id
exports.updateUsuario = async (req, res) => {
  const { id } = req.params;

  // ✅ Validar que el body no esté vacío
  if (!req.body) {
    return res.status(400).json({ message: "No se recibieron datos en el body" });
  }

  const { nombres, apellido1, apellido2, telefono, estado, id_rol } = req.body;

  try {
    await pool.query(`
      UPDATE personal 
      SET nombres=?, apellido1=?, apellido2=?, telefono=?, estado=?, id_rol=? 
      WHERE id_personal=?`,
      [nombres, apellido1, apellido2, telefono, estado, id_rol, id]
    );
    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// DELETE lógico /api/registro/:id
exports.deleteUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE personal SET estado = 'INACTIVO' WHERE id_personal = ?",
      [id]
    );
    res.json({ success: true, message: 'Usuario marcado como INACTIVO' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al desactivar usuario' });
  }
};

// PATCH /api/registro/reactivar/:id
exports.reactivarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE personal SET estado = 'ACTIVO' WHERE id_personal = ?",
      [id]
    );
    res.json({ success: true, message: 'Usuario reactivado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al reactivar usuario' });
  }
};