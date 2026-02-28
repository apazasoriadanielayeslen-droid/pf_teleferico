// dashboardOperador.js
// Versión mejorada: nombre usuario + logout + menú lateral dinámico + chequeos

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard Operador cargado – inicializando funcionalidades");

  // ────────────────────────────────────────────────
  // 1. Mostrar nombre del usuario (en todos los lugares)
  // ────────────────────────────────────────────────
  function mostrarNombreUsuario() {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      console.warn("No hay usuario en localStorage → redirigiendo a login");
      window.location.href = 'login.html';
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const nombre = user.nombre?.trim() || 'Usuario';

      // Actualiza TODOS los elementos con id="nombreUsuario"
      document.querySelectorAll('#nombreUsuario').forEach(el => {
        el.textContent = nombre;
      });

      // Si existe un elemento específico para el turno o responsable
      const turnoEl = document.getElementById('nombreUsuarioTurno');
      if (turnoEl) turnoEl.textContent = nombre;

      console.log(`Nombre mostrado: ${nombre}`);
    } catch (err) {
      console.error("Error al parsear usuario:", err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  }

  // ────────────────────────────────────────────────
  // 2. Hacer el menú lateral dinámico (resaltar enlace activo)
  // ────────────────────────────────────────────────
  function activarEnlaceMenu() {
    const currentPath = window.location.pathname.toLowerCase();
    const menuLinks = document.querySelectorAll('.menu-link');

    menuLinks.forEach(link => {
      const href = link.getAttribute('href')?.toLowerCase() || '';

      // Remueve clase activa de todos
      link.classList.remove('bg-teal-700/60', 'text-white', 'font-semibold');

      // Compara la ruta actual con el href del enlace
      if (currentPath.includes(href) || (href === '#' && currentPath.includes('dashboard'))) {
        link.classList.add('bg-teal-700/60', 'text-white', 'font-semibold');
      }
    });

    console.log("Menú lateral actualizado – enlace activo resaltado");
  }

  // ────────────────────────────────────────────────
  // 3. Configurar cierre de sesión (soporta varios botones)
  // ────────────────────────────────────────────────
  function configurarLogout() {
    const logoutButtons = document.querySelectorAll('#btnLogout, #btnLogoutMobile, .btn-logout');

    logoutButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Puedes agregar más limpiezas si usas otras keys
          console.log("Sesión cerrada exitosamente");
          window.location.href = 'login.html';
        }
      });
    });

    if (logoutButtons.length === 0) {
      console.warn("No se encontraron botones de logout");
    }
  }

  // ────────────────────────────────────────────────
  // Inicialización principal
  // ────────────────────────────────────────────────
  mostrarNombreUsuario();
  configurarLogout();
  activarEnlaceMenu();

  // Opcional: si quieres recargar el menú cuando cambie la página (para SPA)
  window.addEventListener('popstate', activarEnlaceMenu);
});