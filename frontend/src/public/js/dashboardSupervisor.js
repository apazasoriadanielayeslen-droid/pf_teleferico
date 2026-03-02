// dashboardSupervisor.js
// Gestiona la pantalla principal del supervisor: menú lateral, logout, y carga de datos desde la API.

document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard Supervisor cargado');

  const API_URL = 'http://localhost:3000'; // ajustar si es necesario
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No hay token; redirigiendo a login');
    window.location.href = 'login.html';
    return;
  }

  function mostrarNombreYRol(nombre, rol) {
    document.querySelectorAll('#nombreUsuario').forEach(el => el.textContent = nombre);
    const rolEl = document.getElementById('rolUsuario');
    if (rolEl) rolEl.textContent = rol;
  }

  function activarEnlaceMenu() {
    const current = window.location.pathname.toLowerCase();
    document.querySelectorAll('.menu-link').forEach(link => {
      link.classList.remove('bg-teal-700/60', 'text-white', 'font-semibold');
      const href = link.getAttribute('href')?.toLowerCase() || '';
      if (current.includes(href) || (href === 'dashboardsupervisor.html' && current.includes('dashboardsupervisor'))) {
        link.classList.add('bg-teal-700/60', 'text-white', 'font-semibold');
      }
    });
  }

  function configurarIconos() {
    const bell = document.getElementById('btnNotifications');
    if (bell) {
      bell.addEventListener('click', () => {
        window.location.href = 'paginaIncidentes.html';
      });
    }
    const userBtn = document.getElementById('btnUser');
    if (userBtn) {
      userBtn.addEventListener('click', () => {
        // por ahora no hace nada, placeholder para futuras acciones
        alert('Perfil de usuario (próximamente)');
      });
    }
  }

  function configurarLogout() {
    const botones = document.querySelectorAll('#btnLogout, #btnLogoutMobile, .btn-logout');
    botones.forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (confirm('¿Cerrar sesión?')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = 'login.html';
        }
      });
    });
  }

  async function cargarDatos() {
    try {
      const res = await fetch(`${API_URL}/api/supervisor/overview`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        console.error('Error en llamada API', res.status);
        return;
      }
      const data = await res.json();

      mostrarNombreYRol(data.nombre, data.rol);
      document.getElementById('estacionesSupervisadasCount').textContent = data.estaciones.length;
      document.getElementById('cabinasEnRuta').textContent = data.cabinasEnRuta;
      document.getElementById('alertasEnProceso').textContent = data.alertasEnProceso;
      document.getElementById('incidentesActivos').textContent = data.incidentesActivos;
      // actualizar badge de campana
      const badge = document.getElementById('badgeIncidentes');
      if (badge) badge.textContent = data.incidentesActivos;

      // estaciones en tiempo real
      const lista = document.getElementById('listaEstaciones');
      lista.innerHTML = '';
      data.estaciones.forEach(est => {
        const color = est.estado === 'ACTIVA' ? 'bg-green-400' : 'bg-red-400';
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2';
        li.innerHTML = `<span class="w-2 h-2 ${color} rounded-full"></span>${est.nombre}`;
        lista.appendChild(li);
      });

      // alertas recientes
      const listaA = document.getElementById('listaAlertas');
      listaA.innerHTML = '';
      data.recientes.forEach(alert => {
        const div = document.createElement('div');
        // determinar color y emoji
        let colorBorder = 'border-white/20';
        let emoji = '';
        switch (alert.nivel_criticidad) {
          case 'BAJO':
            colorBorder = 'border-green-500/40';
            emoji = '🟢';
            break;
          case 'MEDIO':
            colorBorder = 'border-yellow-500/40';
            emoji = '🟡';
            break;
          case 'ALTO':
            colorBorder = 'border-orange-500/40';
            emoji = '🟠';
            break;
          case 'CRITICO':
            colorBorder = 'border-red-500/40';
            emoji = '🔴';
            break;
          default:
            emoji = '⚠';
        }
        div.className = `p-4 bg-white/5 ${colorBorder} rounded-xl hover:bg-white/10 cursor-pointer`;
        const fecha = new Date(alert.fecha_reporte).toLocaleString();
        div.innerHTML = `<div class="flex justify-between"><div><span class="mr-2">${emoji}</span><span class="font-semibold">${alert.titulo}</span></div><span class="text-xs text-gray-400">${fecha}</span></div><p class="text-sm text-gray-300 mt-1">Estación: ${alert.estacion_nombre || alert.id_estacion}</p>`;
        div.addEventListener('click', () => {
          window.location.href = 'paginaIncidentes.html';
        });
        listaA.appendChild(div);
      });

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    }
  }

  activarEnlaceMenu();
  configurarLogout();
  configurarIconos();
  cargarDatos();
});
