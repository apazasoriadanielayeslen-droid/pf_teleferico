// src/middleware/auth.js

const jwt = require('jsonwebtoken');

// Verifica si hay token válido y lo decodifica
const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado. Inicia sesión.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id_personal, rol, ... }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.'
    });
  }
};

// Verifica que el rol sea el requerido
const verificarRol = (rolRequerido) => {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== rolRequerido) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado: se requiere rol ${rolRequerido}`
      });
    }
    next();
  };
};

module.exports = {
  verificarToken,
  verificarRol
}; 