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
    if (bell) {
      bell.addEventListener('click', () => {
        window.location.href = 'paginaIncidentes.html';
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

  async function cargarCabinas() {
    try {
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

        // Verificar si hay incidente o mantenimiento
        let hasDetail = false;
        try {
          const incRes = await fetch(`${API_URL}/api/supervisor/maint/summary`, {
            headers: { Authorization: 'Bearer ' + token }
          });
          const data = await incRes.json();
          // Simplificar: si hay proximos, asumir que puede haber para esta cabina
          hasDetail = data.proximos.length > 0; // Placeholder, en realidad chequear por cabina
        } catch (err) {}

        div.innerHTML = `
          <div class="text-2xl mb-2">🚠</div>
          <p class="font-semibold">${cab.codigo}</p>
          <p class="text-sm ${estadoColor}">${cab.estado}</p>
          ${hasDetail ? '<button class="mt-2 px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-white text-sm" onclick="verDetalleCabina(' + cab.id_cabina + ')">Ver Detalle</button>' : ''}
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
      if (cabina.estado === 'MANTENIMIENTO') {
        // Obtener último incidente de la cabina
        const res = await fetch(`${API_URL}/api/supervisor/maint/last-incident/${cabina.codigo}`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        const incidente = await res.json();
        if (incidente) {
          contentHtml = `
            <p><strong>Último Incidente:</strong> ${incidente.titulo}</p>
            <p><strong>Tipo:</strong> ${incidente.tipo}</p>
            <p><strong>Nivel:</strong> ${incidente.nivel_criticidad}</p>
            <p><strong>Estado:</strong> ${incidente.estado}</p>
            <p><strong>Fecha Reporte:</strong> ${new Date(incidente.fecha_reporte).toLocaleString()}</p>
            <p><strong>Estación:</strong> ${incidente.estacion_nombre || '-'}</p>
            <p><strong>Descripción:</strong> ${incidente.descripcion || '-'}</p>
          `;
        } else {
          contentHtml = '<p>No hay incidentes registrados para esta cabina.</p>';
        }
      } else {
        // Para otras estados, mostrar incidentes activos
        const res = await fetch(`${API_URL}/api/supervisor/overview`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = await res.json();
        const incidentes = data.recientes.filter(i => i.id_cabina == id || (i.id_estacion == cabina.id_estacion && !i.id_cabina));
        if (incidentes.length > 0) {
          contentHtml = incidentes.map(i => `
            <p><strong>Incidente:</strong> ${i.titulo}</p>
            <p><strong>Estado:</strong> ${i.estado}</p>
            <p><strong>Fecha:</strong> ${new Date(i.fecha_reporte).toLocaleString()}</p>
          `).join('<hr>');
        } else {
          contentHtml = '<p>No hay incidentes activos para esta cabina.</p>';
        }
      }
      const content = document.getElementById('detalleCabinaContent');
      content.innerHTML = contentHtml;
      document.getElementById('modalDetalleCabina').classList.remove('hidden');
    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('closeDetalleCabina').addEventListener('click', () => {
    document.getElementById('modalDetalleCabina').classList.add('hidden');
  });

  activarEnlaceMenu();
  configurarLogout();
  configurarIconos();
  cargarCabinas();
});