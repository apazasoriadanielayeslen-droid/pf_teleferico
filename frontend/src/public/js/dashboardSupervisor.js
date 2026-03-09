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
    const dropdown = document.getElementById('notificationsDropdown');
    if (bell && dropdown) {
      bell.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
          await cargarNotificaciones();
        }
      });
      // cerrar dropdown al hacer click fuera
      document.addEventListener('click', (e) => {
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
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
    const fecha = document.getElementById('filtroFecha').value;
    const nivel = document.getElementById('filtroNivel').value;
    const tipo = document.getElementById('filtroTipo').value;
    const estado = document.getElementById('filtroEstado').value;
    const orden = document.getElementById('filtroOrden').value;

    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (nivel) params.append('nivel', nivel);
    if (tipo) params.append('tipo', tipo);
    if (estado) params.append('estado', estado);
    if (orden) params.append('orden', orden);

    try {
      const res = await fetch(`${API_URL}/api/supervisor/overview?${params}`, {
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

      // cargar notificaciones para actualizar badge
      cargarNotificaciones();

      // estaciones en tiempo real
      const lista = document.getElementById('listaEstaciones');
      lista.innerHTML = '';
      data.estaciones.forEach(est => {
        let color = 'bg-green-400';
        let estadoTexto = 'ACTIVA';
        if (est.estado === 'MANTENIMIENTO') {
          color = 'bg-orange-400';
          estadoTexto = 'MANTENIMIENTO';
        } else if (est.estado === 'BLOQUEADA') {
          color = 'bg-black';
          estadoTexto = 'BLOQUEADA';
        } else if (est.estado === 'INACTIVA') {
          color = 'bg-red-400';
          estadoTexto = 'INACTIVA';
        }
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2';
        li.innerHTML = `<span class="w-2 h-2 ${color} rounded-full"></span>${est.nombre} <span class="text-gray-400">(${est.ubicacion || 'Sin ubicación'})</span> (${estadoTexto})`;
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
          window.location.href = 'paginaMantenimientos.html';
        });
        listaA.appendChild(div);
      });

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    }
  }

  async function cargarNotificaciones() {
    try {
      const res = await fetch(`${API_URL}/api/supervisor/notifications`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) {
        console.error('Error en llamada API notificaciones', res.status);
        return;
      }
      const data = await res.json();
      const lista = document.getElementById('notificationsList');
      lista.innerHTML = '';
      if (data.length === 0) {
        lista.innerHTML = '<p class="text-gray-500">No hay notificaciones nuevas.</p>';
      } else {
        data.forEach(notif => {
          const div = document.createElement('div');
          div.className = 'p-2 bg-gray-100 rounded border-l-4 border-teal-500';
          const fecha = new Date(notif.fecha).toLocaleString();
          div.innerHTML = `<div class="font-semibold">${notif.titulo}</div><div class="text-sm text-gray-600">${notif.mensaje}</div><div class="text-sm text-gray-600">Tipo: ${notif.tipo}</div><div class="text-sm text-gray-600">Incidente: ${notif.titulo_incidente} - ${notif.detalle_incidente}</div><div class="text-xs text-gray-400">${fecha}</div>`;
          lista.appendChild(div);
        });
        // Agregar botón para marcar como leídas
        const markButton = document.createElement('button');
        markButton.textContent = 'Marcar como leídas';
        markButton.className = 'mt-2 px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600';
        markButton.addEventListener('click', async () => {
          await fetch(`${API_URL}/api/supervisor/notifications/mark-read`, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + token }
          });
          await cargarNotificaciones(); // recargar para actualizar
        });
        lista.appendChild(markButton);
      }
      // actualizar badge con el número de notificaciones
      const badge = document.getElementById('badgeNotifications');
      if (badge) badge.textContent = data.length;
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  }

  function configurarFiltros() {
    const filtros = ['filtroFecha', 'filtroNivel', 'filtroTipo', 'filtroEstado', 'filtroOrden'];
    filtros.forEach(id => {
      document.getElementById(id).addEventListener('change', cargarDatos);
    });
  }

  activarEnlaceMenu();
  configurarLogout();
  configurarIconos();
  configurarFiltros();
  cargarDatos();
});
