

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard Operador cargado");

  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const nombre = user.nombre || 'Usuario';

      const nombreElement = document.getElementById('nombreUsuario');
      if (nombreElement) {
        nombreElement.textContent = nombre;
        console.log("Nombre mostrado:", nombre);
      } else {
        console.warn("No se encontró el elemento #nombreUsuario");
      }
    } catch (err) {
      console.error("Error al parsear usuario para mostrar nombre:", err);
    }
  } else {
    console.warn("No hay usuario en localStorage");
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        window.location.href = 'login.html';
      }
    });
  } else {
    console.warn("No se encontró el botón #btnLogout");
  }

});