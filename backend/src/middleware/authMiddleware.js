const jwt = require('jsonwebtoken');

// Middleware para verificar el token enviado por el cliente.
// El token debe ir en el header Authorization con el formato "Bearer <token>".

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // guardamos la información decodificada para que los controladores la utilicen
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error verificando token:', err.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
