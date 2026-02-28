// dashboard_principal.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("Intentando leer sesión del usuario...");

  const userStr = localStorage.getItem('user');

  if (!userStr) {
    console.warn("No hay usuario guardado en localStorage");
    window.location.href = 'login.html';
    return;
  }

  let user;
  try {
    user = JSON.parse(userStr);
    console.log("Usuario encontrado:", user);
  } catch (err) {
    console.error("Error al parsear usuario:", err);
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return;
  }

  const rol = (user.rol_nombre || '').trim().toUpperCase();

  if (!rol) {
    console.warn("No se encontró rol_nombre en el usuario", user);
    window.location.href = 'login.html';
    return;
  }

  console.log("Rol detectado:", rol);

  let destino = 'login.html'; // seguridad

  switch (rol) {
    case 'OPERADOR':
      destino = 'dashboardOperador.html';
      break;
    case 'TECNICO':
    case 'TÉCNICO':
      destino = 'dashboardTecnico.html';
      break;
    case 'SUPERVISOR':
      destino = 'dashboardSupervisor.html';
      break;
    case 'ADMINISTRADOR':
    case 'ADMIN':
      destino = 'dashboardAdmin.html';
      break;
    default:
      console.warn("Rol desconocido:", rol);
      destino = 'login.html';
  }

  console.log("Redirigiendo hacia:", destino);

  // Pequeño retraso para ver logs si es necesario
  setTimeout(() => {
    window.location.href = destino;
  }, 400);
});