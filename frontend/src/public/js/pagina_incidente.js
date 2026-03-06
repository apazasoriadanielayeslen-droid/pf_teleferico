// pagina_incidente.js

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:3000';
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Debes iniciar sesión.');
    window.location.href = 'login.html';
    return;
  }





  
  // Cargar tarjetas resumen
  async function cargarResumenIncidentes() {
    try {
      const res = await fetch(`${API_BASE}/api/incidentes/resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al cargar resumen');

      const data = await res.json();

      document.getElementById('totalIncidentes').textContent = data.total || 0;
      document.getElementById('abiertos').textContent = data.abiertos || 0;
      document.getElementById('enProceso').textContent = data.en_proceso || 0;
      document.getElementById('resueltos').textContent = data.resueltos || 0;
    } catch (err) {
      console.error('Error resumen:', err);
      document.getElementById('totalIncidentes').textContent = 'Error';
      document.getElementById('abiertos').textContent = 'Error';
      document.getElementById('enProceso').textContent = 'Error';
      document.getElementById('resueltos').textContent = 'Error';
    }
  }

  // Cargar incidentes recientes (solo ABIERTO y EN_PROCESO)
  async function cargarIncidentesRecientes() {
    const container = document.getElementById('incidentesRecientes');
    const cargando = document.createElement('p');
    cargando.className = 'text-center text-gray-400';
    cargando.textContent = 'Cargando incidentes recientes...';
    container.innerHTML = '';
    container.appendChild(cargando);

    try {
      const res = await fetch(`${API_BASE}/api/incidentes/recientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${res.status}`);
      }

      const incidentes = await res.json();

      container.innerHTML = ''; // Limpiar cargando

      if (incidentes.length === 0) {
        const sin = document.createElement('p');
        sin.id = 'sinIncidentes';
        sin.className = 'text-center text-gray-400';
        sin.textContent = 'No hay incidentes abiertos o en proceso en tus estaciones asignadas.';
        container.appendChild(sin);
        return;
      }

      incidentes.forEach(inc => {
        const severidadColor = {
          'BAJO': 'blue',
          'MEDIO': 'yellow',
          'ALTO': 'orange',
          'CRITICO': 'red'
        }[inc.nivel_criticidad] || 'gray';

        const estadoColor = {
          'ABIERTO': 'yellow',
          'EN_PROCESO': 'orange'
        }[inc.estado] || 'gray';

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

      // Evento para "Ver Detalles"
      document.querySelectorAll('.ver-detalles').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const d = e.target.dataset;
          alert(
            `INCIDENTE #${d.id}\n\n` +
            `Título: ${d.titulo}\n` +
            `Descripción: ${d.descripcion}\n\n` +
            `Estado: ${d.estado}\n` +
            `Nivel de criticidad: ${d.nivel}\n` +
            `Estación: ${d.estacion}\n` +
            `Reportado por: ${d.reportado}\n` +
            `Fecha de reporte: ${new Date(d.fecha).toLocaleString('es-BO')}`
          );
        });
      });

    } catch (err) {
      console.error('Error al cargar incidentes recientes:', err);
      container.innerHTML = '<p class="text-red-400 text-center">Error al cargar incidentes recientes</p>';
    }
  }

  // Cargar todo al inicio
  cargarResumenIncidentes();
  cargarIncidentesRecientes();

  // Lógica del modal nuevo incidente (tu código existente)
  const btnNuevo = document.getElementById('btnNuevoIncidente');
  const modal = document.getElementById('modalNuevoIncidente');
  const btnCerrar = document.getElementById('btnCerrarModal');
  const btnCancelar = document.getElementById('btnCancelar');
  const form = document.getElementById('formNuevoIncidente');
  const selectEstacion = document.getElementById('selectEstacion');
  const selectCabina = document.getElementById('selectCabina');

  btnNuevo.addEventListener('click', () => {
    modal.classList.remove('hidden');
    cargarEstacionesAsignadas();
  });

  const cerrarModal = () => {
    modal.classList.add('hidden');
    form.reset();
    selectCabina.disabled = true;
    selectCabina.innerHTML = '<option value="">-- Primero selecciona estación --</option>';
  };

  btnCerrar.addEventListener('click', cerrarModal);
  btnCancelar.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
  });

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
      return;
    }

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
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if (!data.id_estacion || data.id_estacion === '') data.id_estacion = null;
    if (!data.id_cabina || data.id_cabina === '') data.id_cabina = null;

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
      cargarResumenIncidentes(); // Recargar tarjetas
      cargarIncidentesRecientes(); // Recargar lista recientes

    } catch (err) {
      console.error('Error registrar:', err);
      alert('No se pudo registrar.\n' + err.message);
    }
  });
});