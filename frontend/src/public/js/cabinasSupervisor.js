// cabinasSupervisor.js
// Gestiona la pantalla de cabinas del supervisor.

document.addEventListener('DOMContentLoaded', () => {
  console.log('Cabinas Supervisor cargado');

  const API_URL = 'http://localhost:3000';
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
      if (current.includes(href) || (href === 'paginacabinas.html' && current.includes('cabinas'))) {
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
      document.addEventListener('click', (e) => {
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }
    const userBtn = document.getElementById('btnUser');
    if (userBtn) {
      userBtn.addEventListener('click', () => {
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

  let cabinas = [];

  async function cargarCabinasYUsuario() {
    try {
      const resData = await fetch(`${API_URL}/api/supervisor/overview`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (resData.ok) {
        const u = await resData.json();
        mostrarNombreYRol(u.nombre, u.rol);
      }
      
      cargarNotificaciones(); // fill notifications bagde at first

      const res = await fetch(`${API_URL}/api/supervisor/cabinas`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) return;
      cabinas = await res.json();
      const lista = document.getElementById('listaCabinas');
      lista.innerHTML = '';
      cabinas.forEach(async cab => {
        const div = document.createElement('div');
        div.className = 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center';
        let estadoColor = 'text-green-400';
        if (cab.estado === 'MANTENIMIENTO') estadoColor = 'text-orange-400';
        else if (cab.estado === 'BLOQUEADA') estadoColor = 'text-black';
        else if (cab.estado === 'INACTIVA') estadoColor = 'text-red-400';

        div.innerHTML = `
          <div class="text-2xl mb-2">🚠</div>
          <p class="font-semibold">${cab.codigo}</p>
          <p class="text-sm ${estadoColor}">${cab.estado}</p>
          <button class="mt-2 px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-white text-sm" onclick="verDetalleCabina(${cab.id_cabina})">Ver Detalle</button>
        `;
        lista.appendChild(div);
      });
    } catch (err) {
      console.error('Error cargando cabinas:', err);
    }
  }

  window.verDetalleCabina = async function(id) {
    const cabina = cabinas.find(c => c.id_cabina == id);
    if (!cabina) return;
    try {
      let contentHtml = '';
      
      const res = await fetch(`${API_URL}/api/supervisor/maint/cabina/${id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const mantenimientos = await res.json();
        if (mantenimientos.length > 0) {
          contentHtml = mantenimientos.map(m => `
            <div class="mb-4 border-b pb-2 border-gray-200">
              <p><strong><span class="text-lg">${m.tipo === 'PREVENTIVO' ? '📅' : '🛠️'}</span> Tarea:</strong> ${m.titulo_mantenimiento}</p>
              <p><strong>Tipo:</strong> ${m.tipo}</p>
              <p><strong>Estado:</strong> ${m.estado}</p>
              <p><strong>Fecha Programada:</strong> ${m.fecha_programada ? new Date(m.fecha_programada).toLocaleString() : '-'}</p>
              <p><strong>Descripción:</strong> ${m.descripcion || 'Sin descripción.'}</p>
              <p><strong>Técnico Responsable:</strong> ${m.tecnico_nombre || 'No asignado'}</p>
            </div>
          `).join('');
        } else {
          contentHtml = '<p class="text-gray-500">No hay mantenimientos registrados para esta cabina.</p>';
        }
      } else {
        contentHtml = '<p class="text-red-500">Error obteniendo los mantenimientos.</p>';
      }

      const content = document.getElementById('detalleCabinaContent');
      content.innerHTML = contentHtml;
      document.getElementById('modalDetalleCabina').classList.remove('hidden');
    } catch (err) {
      console.error(err);
    }
  };

  async function cargarNotificaciones() {
    try {
      const res = await fetch(`${API_URL}/api/supervisor/notifications`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) return;
      const data = await res.json();
      const lista = document.getElementById('notificationsList');
      if(lista){
        lista.innerHTML = '';
        if (data.length === 0) {
          lista.innerHTML = '<p class="text-gray-500">No hay notificaciones nuevas.</p>';
        } else {
          data.forEach(notif => {
            const div = document.createElement('div');
            div.className = 'p-2 bg-gray-100 rounded border-l-4 border-teal-500';
            const fecha = new Date(notif.fecha).toLocaleString();
            div.innerHTML = `<div class="font-semibold text-sm">${notif.titulo}</div><div class="text-sm text-gray-600">${notif.mensaje}</div><div class="text-xs text-gray-400 mt-1">${fecha}</div>`;
            lista.appendChild(div);
          });
          const markButton = document.createElement('button');
          markButton.textContent = 'Marcar como leídas';
          markButton.className = 'mt-2 px-4 py-2 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 w-full';
          markButton.addEventListener('click', async () => {
            await fetch(`${API_URL}/api/supervisor/notifications/mark-read`, {
              method: 'PUT',
              headers: { Authorization: 'Bearer ' + token }
            });
            await cargarNotificaciones();
          });
          lista.appendChild(markButton);
        }
      }
      const badge = document.getElementById('badgeNotifications');
      if (badge) badge.textContent = data.length;
    } catch (err) {
      console.error('Error notifs:', err);
    }
  }

  document.getElementById('closeDetalleCabina').addEventListener('click', () => {
    document.getElementById('modalDetalleCabina').classList.add('hidden');
  });

  activarEnlaceMenu();
  configurarLogout();
  configurarIconos();
  cargarCabinasYUsuario();
});