// dashboardTecnico.js
// Gestión del dashboard para el rol Técnico

document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard Técnico cargado');

  const API_URL = 'http://localhost:3000';
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Elementos del DOM
  const nombreUsuario = document.getElementById('nombreUsuario');
  const rolUsuario = document.getElementById('rolUsuario');
  const mantenimientosEnProceso = document.getElementById('mantenimientosEnProceso');
  const mantenimientosPreventivos = document.getElementById('mantenimientosPreventivos');
  const mantenimientosCorrectivos = document.getElementById('mantenimientosCorrectivos');
  const listaMantenimientos = document.getElementById('listaMantenimientos');

  // Modales
  const modalDetalle = document.getElementById('modalDetalle');
  const modalConfirmar = document.getElementById('modalConfirmar');
  const modalNotificacion = document.getElementById('modalNotificacion');
  const detalleContent = document.getElementById('detalleContent');
  const formNotificacion = document.getElementById('formNotificacion');

  let currentMantenimientoId = null;

  // Cargar datos iniciales
  async function cargarDatos() {
    try {
      const res = await fetch(`${API_URL}/api/tecnico/overview`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Error al cargar overview');
      const data = await res.json();

      nombreUsuario.textContent = data.nombre;
      rolUsuario.textContent = data.rol;
      mantenimientosEnProceso.textContent = data.mantenimientosEnProceso;
      mantenimientosPreventivos.textContent = data.mantenimientosPreventivos;
      mantenimientosCorrectivos.textContent = data.mantenimientosCorrectivos;

      // Cargar mantenimientos asignados
      await cargarMantenimientos();
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  }

  // Event listeners para filtros
  document.getElementById('btnEnProceso').addEventListener('click', () => {
    cargarMantenimientos({ estado: 'EN_PROCESO' });
  });
  document.getElementById('btnPreventivos').addEventListener('click', () => {
    cargarMantenimientos({ tipo: 'PREVENTIVO' });
  });
  document.getElementById('btnCorrectivos').addEventListener('click', () => {
    cargarMantenimientos({ tipo: 'CORRECTIVO' });
  });

  // Cargar mantenimientos asignados
  async function cargarMantenimientos(filtros = {}) {
    try {
      const params = new URLSearchParams(filtros);
      const res = await fetch(`${API_URL}/api/tecnico/mantenimientos?${params}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Error al cargar mantenimientos');
      const mantenimientos = await res.json();

      listaMantenimientos.innerHTML = '';
      if (mantenimientos.length === 0) {
        listaMantenimientos.innerHTML = '<p>No hay mantenimientos asignados.</p>';
        return;
      }

      mantenimientos.forEach(m => {
        const div = document.createElement('div');
        div.className = 'bg-white/10 border border-white/20 rounded-xl p-4';
        div.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-semibold text-lg">${m.estacion_nombre} <span class="text-gray-400">(${m.ubicacion})</span></h3>
              <p class="text-sm text-gray-300">${m.titulo_mantenimiento}</p>
              <p class="text-sm text-gray-300">Cabina: ${m.cabina_codigo || '-'}</p>
              <p class="text-sm text-gray-300">Tipo: ${m.tipo}</p>
              <p class="text-sm text-gray-300">Fecha programada: ${new Date(m.fecha_programada).toLocaleString()}</p>
            </div>
            <div class="flex gap-2">
              <button class="btnDetalle px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" data-id="${m.id_mantenimiento}">Ver detalles</button>
              ${m.estado === 'EN_PROCESO' ? `<button class="btnFinalizar px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600" data-id="${m.id_mantenimiento}">Finalizar</button>` : ''}
            </div>
          </div>
          <p class="text-sm text-gray-400">${m.descripcion}</p>
        `;
        listaMantenimientos.appendChild(div);
      });

      // Event listeners para botones
      document.querySelectorAll('.btnDetalle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          mostrarDetalle(id);
        });
      });

      document.querySelectorAll('.btnFinalizar').forEach(btn => {
        btn.addEventListener('click', (e) => {
          currentMantenimientoId = e.target.dataset.id;
          modalConfirmar.classList.remove('hidden');
        });
      });
    } catch (err) {
      console.error('Error cargando mantenimientos:', err);
    }
  }

  // Mostrar detalle del mantenimiento
  async function mostrarDetalle(id) {
    try {
      const res = await fetch(`${API_URL}/api/tecnico/mantenimiento/${id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Error al cargar detalle');
      const m = await res.json();

      detalleContent.innerHTML = `
        <p><strong>Estación:</strong> ${m.estacion_nombre} (${m.ubicacion})</p>
        <p><strong>Cabina:</strong> ${m.cabina_codigo || '-'}</p>
        <p><strong>Título:</strong> ${m.titulo_mantenimiento}</p>
        <p><strong>Tipo:</strong> ${m.tipo}</p>
        <p><strong>Descripción:</strong> ${m.descripcion}</p>
        <p><strong>Fecha programada:</strong> ${new Date(m.fecha_programada).toLocaleString()}</p>
        <p><strong>Estado:</strong> ${m.estado}</p>
      `;

      modalDetalle.classList.remove('hidden');
    } catch (err) {
      console.error('Error mostrando detalle:', err);
    }
  }

  // Event listeners para modales
  document.getElementById('btnFinalizar').addEventListener('click', () => {
    modalDetalle.classList.add('hidden');
    modalConfirmar.classList.remove('hidden');
  });

  document.getElementById('closeModalDetalle').addEventListener('click', () => {
    modalDetalle.classList.add('hidden');
  });

  document.getElementById('btnConfirmarFinalizar').addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_URL}/api/tecnico/mantenimiento/${currentMantenimientoId}/finalizar`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Error al finalizar');
      const data = await res.json();

      // Mostrar modal de notificación
      modalConfirmar.classList.add('hidden');
      mostrarModalNotificacion(currentMantenimientoId, data.fechaRealizada);
    } catch (err) {
      console.error('Error finalizando mantenimiento:', err);
      alert('Error al finalizar el mantenimiento');
    }
  });

  document.getElementById('btnCancelarFinalizar').addEventListener('click', () => {
    modalConfirmar.classList.add('hidden');
  });

  // Mostrar modal de notificación
  async function mostrarModalNotificacion(mantenimientoId, fechaRealizada) {
    try {
      // Obtener datos del mantenimiento finalizado
      const res = await fetch(`${API_URL}/api/tecnico/mantenimiento/${mantenimientoId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Error al cargar datos para notificación');
      const m = await res.json();

      document.getElementById('notifTitulo').value = `Mantenimiento Finalizado: ${m.titulo_mantenimiento}`;
      document.getElementById('notifTecnico').value = nombreUsuario.textContent;
      document.getElementById('notifTipo').value = `Mantenimiento ${m.tipo.toLowerCase()}`;
      document.getElementById('notifMensaje').value = `Mantenimiento realizado por ${nombreUsuario.textContent}. Detalles: `;

      modalNotificacion.classList.remove('hidden');
    } catch (err) {
      console.error('Error mostrando modal notificación:', err);
    }
  }

  // Enviar notificación
  formNotificacion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('notifTitulo').value;
    const mensaje = document.getElementById('notifMensaje').value;
    const tipo = 'MANTENIMIENTO';

    // Obtener id_incidente del mantenimiento actual
    let idIncidente = null;
    if (currentMantenimientoId) {
      try {
        const res = await fetch(`${API_URL}/api/tecnico/mantenimiento/${currentMantenimientoId}`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) {
          const m = await res.json();
          idIncidente = m.id_incidente;
        }
      } catch (err) {
        console.error('Error obteniendo id_incidente:', err);
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/tecnico/notificacionG`, {//ESTO CREO
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({ titulo, mensaje, tipo, id_incidente: idIncidente, id_mantenimiento: currentMantenimientoId })
      });
      if (!res.ok) throw new Error('Error al enviar notificación');

      alert('Notificación enviada correctamente');
      modalNotificacion.classList.add('hidden');
      cargarDatos(); // Recargar datos
    } catch (err) {
      console.error('Error enviando notificación:', err);
      alert('Error al enviar la notificación');
    }
  });

  document.getElementById('btnCancelarNotif').addEventListener('click', () => {
    modalNotificacion.classList.add('hidden');
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    }
  });

  // Cargar datos iniciales
  cargarDatos();
});