document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:3000';
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Debes iniciar sesión.');
    window.location.href = 'login.html';
    return;
  }

  const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';

  // Elementos del DOM - incidentes
  const estacionActualSpan = document.getElementById('estacionActual');
  const btnNuevo           = document.getElementById('btnNuevoIncidente');
  const modal              = document.getElementById('modalNuevoIncidente');
  const btnCerrar          = document.getElementById('btnCerrarModal');
  const btnCancelar        = document.getElementById('btnCancelar');
  const form               = document.getElementById('formNuevoIncidente');
  const selectEstacion     = document.getElementById('selectEstacion');
  const selectCabina       = document.getElementById('selectCabina');

  // Elementos del DOM - campanita
  const btnNotificaciones   = document.getElementById('btnNotificaciones');
  const modalNotificaciones = document.getElementById('modalNotificaciones');
  const modalNotifContent   = document.getElementById('modalNotifContent');
  const sinPendientesModal  = document.getElementById('sinPendientesModal');
  const cerrarModalNotif    = document.getElementById('cerrarModalNotif');
  const notifBadge          = document.getElementById('notifBadge');

  let incidentesOriginales = [];

  // ════════════════════════════════════════════════
  // CAMPANITA — badge + modal (igual que dashboard y pasajeros)
  // ════════════════════════════════════════════════

  // Actualizar badge al entrar a la página (persiste el conteo)
  async function actualizarBadge() {
    try {
      const res = await fetch(`${API_BASE}/api/notificaciones/ignoradas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(res.status);
      const notifs = await res.json();

      if (notifs.length > 0) {
        notifBadge.textContent = notifs.length;
        notifBadge.classList.remove('hidden');
      } else {
        notifBadge.classList.add('hidden');
      }
    } catch (err) {
      console.error("Error badge notificaciones:", err);
      notifBadge.classList.add('hidden');
    }
  }

  // Abrir modal campanita
  btnNotificaciones.addEventListener('click', async () => {
    modalNotificaciones.classList.remove('hidden');
    await cargarNotificacionesModal();
    await actualizarBadge();
  });

  // Cerrar modal campanita
  cerrarModalNotif.addEventListener('click', () => modalNotificaciones.classList.add('hidden'));
  modalNotificaciones.addEventListener('click', (e) => {
    if (e.target === modalNotificaciones) modalNotificaciones.classList.add('hidden');
  });

  // Cargar lista de notificaciones dentro del modal
  async function cargarNotificacionesModal() {
    modalNotifContent.innerHTML = '<p class="text-center text-gray-400 py-4">Cargando...</p>';
    sinPendientesModal.classList.add('hidden');

    try {
      const res = await fetch(`${API_BASE}/api/notificaciones/ignoradas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(res.status);
      const notifs = await res.json();

      modalNotifContent.innerHTML = '';

      if (notifs.length === 0) {
        sinPendientesModal.classList.remove('hidden');
        return;
      }

      notifs.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'bg-red-900/40 border border-red-700/40 p-4 rounded-xl hover:bg-red-800/50 transition';
        item.innerHTML = `
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div class="flex-1">
              <p class="font-semibold text-white">${notif.titulo}</p>
              <p class="text-sm text-gray-300 mt-0.5">${notif.mensaje}</p>
              <p class="text-xs text-gray-400 mt-1">
                📍 ${notif.estacion || 'N/A'} &nbsp;·&nbsp;
                🕐 ${new Date(notif.fecha).toLocaleString('es-BO')}
              </p>
            </div>
          </div>
        `;
        modalNotifContent.appendChild(item);
      });

    } catch (err) {
      console.error("Error modal notificaciones:", err);
      modalNotifContent.innerHTML = '<p class="text-red-400 text-center">Error al cargar notificaciones.</p>';
    }
  }

  // Llamar al badge al cargar la página
  actualizarBadge();

  // ════════════════════════════════════════════════
  // LÓGICA DE INCIDENTES (sin cambios)
  // ════════════════════════════════════════════════

  function actualizarEstacionHeader(nombre = 'Sin estación seleccionada') {
    if (estacionActualSpan) estacionActualSpan.textContent = nombre;
  }

  function getEstacionIdActual() {
    return localStorage.getItem(ULTIMA_ESTACION_KEY);
  }

  async function mostrarEstacionEnHeader() {
    const ultimaId = getEstacionIdActual();
    if (!ultimaId) { actualizarEstacionHeader(); return; }

    try {
      const res = await fetch(`${API_BASE}/api/incidentes/estaciones/asignadas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const estaciones = await res.json();
      const estacion = estaciones.find(e => String(e.id_estacion) === String(ultimaId));
      actualizarEstacionHeader(estacion?.nombre || 'Estación no asignada');
    } catch (err) {
      console.error('Error al cargar nombre de estación:', err);
      actualizarEstacionHeader('Estación no disponible');
    }
  }

  async function cargarResumenIncidentes() {
    try {
      const id_estacion = getEstacionIdActual();
      let url = `${API_BASE}/api/incidentes/resumen`;
      if (id_estacion) url += `?estacion=${id_estacion}`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      document.getElementById('totalIncidentes').textContent = data.total    || 0;
      document.getElementById('abiertos').textContent        = data.abiertos  || 0;
      document.getElementById('enProceso').textContent       = data.en_proceso || 0;
      document.getElementById('resueltos').textContent       = data.resueltos  || 0;
    } catch (err) {
      console.error('Error al cargar resumen:', err);
      ['totalIncidentes','abiertos','enProceso','resueltos'].forEach(id => {
        document.getElementById(id).textContent = 'Error';
      });
    }
  }

  async function cargarIncidentesRecientes() {
    const container = document.getElementById('incidentesRecientes');
    container.innerHTML = '<p class="text-center text-gray-400">Cargando incidentes recientes...</p>';

    try {
      const id_estacion = getEstacionIdActual();
      let url = `${API_BASE}/api/incidentes/recientes`;
      if (id_estacion) url += `?estacion=${id_estacion}`;

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);

      incidentesOriginales = await res.json();
      filtrarIncidentes();
    } catch (err) {
      console.error('Error al cargar incidentes recientes:', err);
      container.innerHTML = '<p class="text-red-400 text-center">Error al cargar incidentes recientes</p>';
    }
  }

  function renderizarIncidentes(incidentes) {
    const container = document.getElementById('incidentesRecientes');
    container.innerHTML = '';

    if (incidentes.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400">No hay incidentes que coincidan con los filtros.</p>';
      return;
    }

    incidentes.forEach(inc => {
      const severidadColor = { 'BAJO': 'blue', 'MEDIO': 'yellow', 'ALTO': 'orange', 'CRITICO': 'red' }[inc.nivel_criticidad] || 'gray';
      const estadoColor    = { 'ABIERTO': 'yellow', 'EN_PROCESO': 'orange' }[inc.estado] || 'gray';

      const card = document.createElement('div');
      card.className = `bg-white/5 border border-${severidadColor}-600/40 rounded-xl p-5 hover:bg-white/10 transition`;
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-${severidadColor}-400 text-xl">⚠</span>
              <h3 class="font-semibold">${inc.titulo} #INC${String(inc.id_incidente).padStart(3, '0')}</h3>
            </div>
            <p class="text-sm text-gray-400 mt-1">
              ${inc.estacion || 'Sin estación'} • ${new Date(inc.fecha_reporte).toLocaleString('es-BO')} • ${inc.reportado_por || 'Desconocido'}
            </p>
          </div>
          <div class="text-right">
            <span class="px-3 py-1 bg-${estadoColor}-800/50 text-${estadoColor}-300 rounded-full text-sm">${inc.estado}</span>
            <p class="text-xs text-gray-400 mt-2">${inc.nivel_criticidad}</p>
          </div>
        </div>
        <div class="mt-3 flex gap-4 text-sm">
          <button class="text-teal-300 hover:text-teal-200 ver-detalles"
                  data-id="${inc.id_incidente}"
                  data-titulo="${inc.titulo.replace(/"/g, '&quot;')}"
                  data-descripcion="${inc.descripcion.replace(/"/g, '&quot;')}"
                  data-estado="${inc.estado}"
                  data-nivel="${inc.nivel_criticidad}"
                  data-fecha="${inc.fecha_reporte}"
                  data-estacion="${inc.estacion || 'N/A'}"
                  data-reportado="${inc.reportado_por || 'Desconocido'}">
            Ver Detalles
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.ver-detalles').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.target.dataset;
        alert(
          `INCIDENTE #${d.id}\n\n` +
          `Título: ${d.titulo}\n` +
          `Descripción: ${d.descripcion}\n\n` +
          `Estado: ${d.estado}\n` +
          `Nivel: ${d.nivel}\n` +
          `Estación: ${d.estacion}\n` +
          `Reportado por: ${d.reportado}\n` +
          `Fecha: ${new Date(d.fecha).toLocaleString('es-BO')}`
        );
      });
    });
  }

  function filtrarIncidentes() {
    const texto           = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
    const criticidadFiltro = document.getElementById('filtroCriticidad')?.value || '';

    let filtrados = incidentesOriginales;

    if (texto) {
      filtrados = filtrados.filter(inc =>
        (inc.titulo       || '').toLowerCase().includes(texto) ||
        (inc.descripcion  || '').toLowerCase().includes(texto) ||
        (inc.estacion     || '').toLowerCase().includes(texto) ||
        (inc.reportado_por|| '').toLowerCase().includes(texto) ||
        String(inc.id_incidente).includes(texto)
      );
    }

    if (criticidadFiltro) {
      filtrados = filtrados.filter(inc => inc.nivel_criticidad === criticidadFiltro);
    }

    renderizarIncidentes(filtrados);
  }

  // Carga inicial
  mostrarEstacionEnHeader();
  cargarResumenIncidentes();
  cargarIncidentesRecientes();

  // Listeners filtros
  document.getElementById('searchInput')?.addEventListener('input', filtrarIncidentes);
  document.getElementById('filtroCriticidad')?.addEventListener('change', filtrarIncidentes);

  // ── Modal nuevo incidente ──
  btnNuevo.addEventListener('click', async () => {
    modal.classList.remove('hidden');
    await cargarEstacionesAsignadas();
    const ultimaId = localStorage.getItem(ULTIMA_ESTACION_KEY);
    if (ultimaId && selectEstacion.querySelector(`option[value="${ultimaId}"]`)) {
      selectEstacion.value = ultimaId;
      selectEstacion.dispatchEvent(new Event('change'));
    }
  });

  const cerrarModal = () => {
    modal.classList.add('hidden');
    form.reset();
    selectCabina.disabled = true;
    selectCabina.innerHTML = '<option value="">-- Primero selecciona estación --</option>';
  };

  btnCerrar.addEventListener('click', cerrarModal);
  btnCancelar.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

  async function cargarEstacionesAsignadas() {
    try {
      const res = await fetch(`${API_BASE}/api/incidentes/estaciones/asignadas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar estaciones');
      const estaciones = await res.json();

      selectEstacion.innerHTML = '<option value="">-- Seleccionar estación --</option>';
      if (estaciones.length === 0) {
        selectEstacion.innerHTML += '<option value="" disabled>No tienes estaciones asignadas</option>';
        return;
      }
      estaciones.forEach(est => {
        const opt = document.createElement('option');
        opt.value = est.id_estacion;
        opt.textContent = est.nombre;
        selectEstacion.appendChild(opt);
      });
    } catch (err) {
      console.error('Error estaciones:', err);
      selectEstacion.innerHTML = '<option value="">Error al cargar</option>';
    }
  }

  selectEstacion.addEventListener('change', async () => {
    const idEst = selectEstacion.value;
    selectCabina.disabled = true;
    selectCabina.innerHTML = '<option value="">Cargando...</option>';

    if (!idEst) {
      selectCabina.innerHTML = '<option value="">-- Primero selecciona estación --</option>';
      actualizarEstacionHeader();
      cargarResumenIncidentes();
      cargarIncidentesRecientes();
      return;
    }

    localStorage.setItem(ULTIMA_ESTACION_KEY, idEst);
    actualizarEstacionHeader(selectEstacion.options[selectEstacion.selectedIndex].text.trim());

    try {
      const res = await fetch(`${API_BASE}/api/incidentes/cabinas?estacion=${idEst}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar cabinas');
      const cabinas = await res.json();

      selectCabina.innerHTML = '<option value="">-- Cabina (opcional) --</option>';
      cabinas.forEach(cab => {
        const opt = document.createElement('option');
        opt.value = cab.id_cabina;
        opt.textContent = `${cab.codigo} (${cab.estado})`;
        selectCabina.appendChild(opt);
      });
      selectCabina.disabled = false;
    } catch (err) {
      console.error('Error cabinas:', err);
      selectCabina.innerHTML = '<option value="">Error al cargar</option>';
    }

    cargarResumenIncidentes();
    cargarIncidentesRecientes();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if (!data.id_estacion || data.id_estacion === '') data.id_estacion = null;
    if (!data.id_cabina   || data.id_cabina   === '') data.id_cabina   = null;

    try {
      const res = await fetch(`${API_BASE}/api/incidentes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al registrar');
      }

      const resultado = await res.json();
      alert(`¡Incidente reportado!\nID: ${resultado.id}`);
      cerrarModal();
      cargarResumenIncidentes();
      cargarIncidentesRecientes();
    } catch (err) {
      console.error('Error registrar:', err);
      alert('No se pudo registrar.\n' + err.message);
    }
  });
});