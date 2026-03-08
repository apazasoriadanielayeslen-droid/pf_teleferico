// mantenimientoSupervisor.js
// funcionalidad para el área de mantenimiento

document.addEventListener('DOMContentLoaded', () => {
  console.log('Mantenimiento Supervisor cargado');
  const API_URL = 'http://localhost:3000';
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // elementos comunes
  const badge = document.getElementById('badgeMantenimientos');
  const countTotal = document.getElementById('countTotal');
  const countPend = document.getElementById('countPendientes');
  const countEnProc = document.getElementById('countEnProceso');
  const countCompHoy = document.getElementById('countCompletadosHoy');
  const sectionConteos = document.getElementById('sectionConteos');

  let cabinasList = [];
  let stationsList = [];
  let proximosList = [];
  const modal = document.getElementById('modalForm');
  const btnNew = document.getElementById('btnNew');
  const btnClose = document.getElementById('closeModal');
  const btnCancel = document.getElementById('btnCancel');
  const form = document.getElementById('maintForm');
  async function fetchCabinas() {
    try {
      const r = await fetch(`${API_URL}/api/supervisor/cabinas`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      cabinasList = await r.json();
      const datalist = document.getElementById('cabinasList');
      datalist.innerHTML = '';
      cabinasList.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.codigo;
        datalist.appendChild(opt);
      });
    } catch (err) { console.error(err); }
  }
  async function fetchStations() {
    try {
      const r = await fetch(`${API_URL}/api/supervisor/stations`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      stationsList = await r.json();
      const sel = document.getElementById('inpEstacion');
      sel.innerHTML = '<option value="">-- seleccionar --</option>';
      stationsList.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id_estacion;
        o.innerHTML = `${s.nombre} <span style='color:#888;'>(${s.ubicacion || ''})</span>`;
        sel.appendChild(o);
      });
    } catch (err) { console.error(err); }
  }
  async function fetchTechs() {
    const resp = await fetch(`${API_URL}/api/supervisor/maint/technicians`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    return await resp.json();
  }

  function showModal() {
    modal.classList.remove('hidden');
  }
  function hideModal() {
    modal.classList.add('hidden');
    form.reset();
    document.getElementById('inpIncidenteId').value = '';
  }
  // proximosList now holds incident objects from API
  function updateSummary() {
    return fetch(`${API_URL}/api/supervisor/maint/summary`, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json()).then(data => {
      countTotal.textContent = data.total;
      countPend.textContent = data.pendientes;
      countEnProc.textContent = data.enProceso;
      countCompHoy.textContent = data.completadosHoy;
      proximosList = data.proximos;
      if (badge) badge.textContent = data.enProceso;
    }).catch(err => console.error(err));
  }

  function mostrarLista(params={}, title='') {
    const query = new URLSearchParams(params).toString();
    fetch(`${API_URL}/api/supervisor/maint/list?${query}`, {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json()).then(rows => {
      let html = `<div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"><h2 class="text-xl font-bold mb-4">${title}</h2>`;
      if (rows.length === 0) {
        html += '<p>Ningún mantenimiento encontrado.</p>';
      } else {
        rows.forEach(m => {
          html += `<div class="border-b border-white/20 py-2">
                    <div class="flex justify-between items-center">
                      <div>
                        <span class="font-semibold">${m.titulo_mantenimiento}</span><br>
                        <span class="text-sm text-gray-400">${new Date(m.fecha_programada).toLocaleDateString()}</span>
                      </div>
                      <div class="flex gap-2 text-sm">
                        <button class="text-blue-400 hover:underline btnDetalle" data-id="${m.id_mantenimiento}">Ver detalle</button>`;
          if (params.estado !== 'EN_PROCESO') {
            html += `<button class="text-green-400 hover:underline btnIniciar2" data-id="${m.id_mantenimiento}">Iniciar</button>`;
          }
          html += `<button class="text-yellow-400 hover:underline btnEditar" data-id="${m.id_mantenimiento}">Editar</button>
                      </div>
                    </div>
                    <p class="text-sm text-gray-300">Estación: ${m.estacion_nombre || '-'} Cabina: ${m.cabina_codigo || '-'}</p>
                   </div>`;
        });
      }
      html += '</div>';
      sectionConteos.innerHTML = html;

      // attach additional handlers if needed
      document.querySelectorAll('.btnIniciar2').forEach(btn => {
        btn.addEventListener('click', () => {
          // open modal but only prefill title
          const id = btn.dataset.id;
          const item = rows.find(r => r.id_mantenimiento == id);
          showModal();
          document.getElementById('inpTitulo').value = item.titulo_mantenimiento;
        });
      });
      // detalle/editar
      document.querySelectorAll('.btnDetalle').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.dataset.id;
          try {
            const r = await fetch(`${API_URL}/api/supervisor/maint/${id}`, {
              headers: { Authorization: 'Bearer ' + token }
            });
            const data = await r.json();
            if (r.ok) {
              alert(`Detalle:\nTítulo: ${data.titulo_mantenimiento}\nTipo: ${data.tipo}\nEstado: ${data.estado}\nFecha: ${data.fecha_programada}\nDescripción: ${data.descripcion}`);
            }
          } catch (err) { console.error(err); }
        });
      });
      document.querySelectorAll('.btnEditar').forEach(b => {
        b.addEventListener('click', async () => {
          const id = b.dataset.id;
          try {
            const r = await fetch(`${API_URL}/api/supervisor/maint/${id}`, {
              headers: { Authorization: 'Bearer ' + token }
            });
            const data = await r.json();
            if (r.ok) {
              // prefill modal
              showModal();
              document.getElementById('inpTitulo').value = data.titulo_mantenimiento;
              document.getElementById('inpFecha').value = data.fecha_programada.split(' ')[0];
              document.getElementById('inpHora').value = data.fecha_programada.split(' ')[1] || '';
              document.getElementById('inpDescripcion').value = data.descripcion;
              // change submit to update
              form.dataset.editId = id;
            }
          } catch (err) { console.error(err); }
        });
      });
    }).catch(err => console.error(err));
  }

  function setDateButtons() {
    const fechaActualEl = document.getElementById('fechaActual');
    const now = new Date();
    fechaActualEl.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    document.getElementById('btnDia').addEventListener('click', () => {
      const today = new Date().toISOString().slice(0,10);
      mostrarLista({ from: today, to: today }, 'Mantenimientos en proceso hoy');
    });
    document.getElementById('btnSemana').addEventListener('click', () => {
      const curr = new Date();
      const first = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      mostrarLista({ from: first.toISOString().slice(0,10), to: last.toISOString().slice(0,10) }, 'Mantenimientos en proceso esta semana');
    });
    document.getElementById('btnMes').addEventListener('click', () => {
      const m = new Date();
      const first = new Date(m.getFullYear(), m.getMonth(), 1).toISOString().slice(0,10);
      const last = new Date(m.getFullYear(), m.getMonth()+1, 0).toISOString().slice(0,10);
      mostrarLista({ from: first, to: last }, 'Mantenimientos en proceso este mes');
    });
    document.getElementById('btnAño').addEventListener('click', () => {
      const y = new Date().getFullYear();
      mostrarLista({ from: `${y}-01-01`, to: `${y}-12-31` }, 'Mantenimientos en proceso este año');
    });
  }

  document.getElementById('btnSearch').addEventListener('click', () => {
    const term = document.getElementById('searchInput').value.trim();
    if (term) mostrarLista({ search: term }, `Resultados para "${term}"`);
  });

  // inicializaciones
  setDateButtons();
  updateSummary().then(() => {
    // después de cargar resumen también mostramos la lista de proximos automáticamente
    showProximos();
  });

  // botones de conteo expandibles
  countTotal.parentElement.addEventListener('click', () => {
    const y = new Date().getFullYear();
    mostrarLista({ from: `${y}-01-01`, to: `${y}-12-31` }, 'Todos los mantenimientos del año');
  });
  countPend.parentElement.addEventListener('click', () => mostrarLista({ estado:'PENDIENTE' }, 'Mantenimientos pendientes'));
  countEnProc.parentElement.addEventListener('click', () => mostrarLista({ estado:'EN_PROCESO' }, 'Mantenimientos en proceso'));
  countCompHoy.parentElement.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0,10);
    mostrarLista({ estado:'FINALIZADO', from:today, to:today }, 'Mantenimientos finalizados hoy');
  });

  // focus new button - placeholder
  // ---- modal form logic ----

  function showProximos() {
    const container = document.getElementById('proximosContainer');
    let html = `<div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"><h2 class="text-xl font-bold mb-4">Mantenimientos Próximos</h2>`;
    if (proximosList.length === 0) {
      html += '<p>No hay mantenimientos próximos.</p>';
    } else {
      proximosList.forEach(m => {
        // m is an incident
        let emoji = '';
        switch (m.nivel_criticidad) {
          case 'BAJO': emoji = '🟢'; break;
          case 'MEDIO': emoji = '🟡'; break;
          case 'ALTO': emoji = '🟠'; break;
          case 'CRITICO': emoji = '🔴'; break;
          default: emoji = '⚠';
        }
        html += `<div class="border-b border-white/20 py-3 flex justify-between items-center">
                   <div>
                     <div class="font-semibold">${emoji} ${m.titulo}</div>
                     <div class="text-sm text-gray-300">${new Date(m.fecha_reporte).toLocaleString()}<br><span class="italic text-gray-400">Estación: ${m.estacion_nombre||'-'}</span></div>
                   </div>
                   <div class="flex gap-2">
                     <button data-id="${m.id_incidente}" class="btnVerDetalle text-green-500 hover:underline">Ver detalle</button>
                     ${m.tipo !== 'OPERATIVO' ? `<button data-id="${m.id_incidente}" class="btnIniciar text-blue-500 hover:underline">Iniciar</button>` : ''}
                   </div>
                 </div>`;
      });
    }
    html += '</div>';
    container.innerHTML = html;

    document.querySelectorAll('.btnVerDetalle').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        try {
          const r = await fetch(`${API_URL}/api/supervisor/maint/incident/${id}`, {
            headers: { Authorization: 'Bearer ' + token }
          });
          const data = await r.json();
          if (r.ok) {
            const content = document.getElementById('detalleIncidenteContent');
            content.innerHTML = `
              <p><strong>Título:</strong> ${data.titulo}</p>
              <p><strong>Tipo:</strong> ${data.tipo}</p>
              <p><strong>Nivel:</strong> ${data.nivel_criticidad}</p>
              <p><strong>Estado:</strong> ${data.estado}</p>
              <p><strong>Fecha Reporte:</strong> ${new Date(data.fecha_reporte).toLocaleString()}</p>
              <p><strong>Estación:</strong> ${data.estacion_nombre || '-'}</p>
              <p><strong>Cabina:</strong> ${data.cabina_codigo || '-'}</p>
              <p><strong>Descripción:</strong> ${data.descripcion || '-'}</p>
            `;
            document.getElementById('modalDetalleIncidente').classList.remove('hidden');
          }
        } catch (err) { console.error(err); }
      });
    });

    document.querySelectorAll('.btnIniciar').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        const item = proximosList.find(x => x.id_incidente == id);
        if (!item) return;
        showModal();
        document.getElementById('inpTitulo').value = item.titulo;
        document.getElementById('inpEstacion').value = item.id_estacion || '';
        document.getElementById('inpCabina').value = item.cabina_codigo || '';
        document.getElementById('inpIncidenteId').value = id;
        // clear other fields
      });
    });
  }
  btnNew.addEventListener('click', async () => {
    const list = await fetchTechs();
    const sel = document.getElementById('inpTecnico');
    sel.innerHTML = '<option value="">-- seleccionar --</option>';
    list.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id_personal;
      o.textContent = t.nombre;
      sel.appendChild(o);
    });
    await fetchStations();
    await fetchCabinas();
    showModal();
  });
  btnClose.addEventListener('click', hideModal);
  btnCancel.addEventListener('click', hideModal);

  document.getElementById('closeDetalleIncidente').addEventListener('click', () => {
    document.getElementById('modalDetalleIncidente').classList.add('hidden');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const titulo = document.getElementById('inpTitulo').value.trim();
    // Si no tienes select de tipo, puedes ponerlo fijo:
    const tipo = 'PREVENTIVO';
    const id_est = document.getElementById('inpEstacion').value;
    const cabinaCode = document.getElementById('inpCabina').value;
    const foundCab = cabinasList.find(c => c.codigo === cabinaCode);
    const id_cab = foundCab ? foundCab.id_cabina : null;
    const descripcion = document.getElementById('inpDescripcion').value.trim();
    const fecha = document.getElementById('inpFecha').value;
    const hora = document.getElementById('inpHora').value;
    const id_resp = document.getElementById('inpTecnico').value || null;

    // Validaciones básicas
    if (!titulo) return alert('El título es obligatorio');
    if (!id_est) return alert('Debes seleccionar una estación');
    if (!cabinaCode) return alert('Debes ingresar el código de cabina');
    if (!descripcion) return alert('La descripción es obligatoria');
    if (!fecha) return alert('La fecha es obligatoria');
    if (!hora) return alert('La hora es obligatoria');

    const editId = form.dataset.editId;
    const incidenteId = document.getElementById('inpIncidenteId').value || null;
    delete form.dataset.editId;

    try {
      let resp;
      if (editId) {
        const data = {
          titulo,
          tipo,
          id_estacion: id_est,
          id_cabina: id_cab,
          descripcion,
          fecha_programada: fecha,
          hora_programada: hora,
          id_responsable: id_resp,
          estado: 'EN_PROCESO',
          id_incidente: incidenteId
        };
        resp = await fetch(`${API_URL}/api/supervisor/maint/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(data)
        });
      } else {
        const data = {
          titulo,
          tipo,
          id_estacion: id_est,
          id_cabina: id_cab,
          descripcion,
          fecha_programada: fecha,
          hora_programada: hora,
          id_responsable: id_resp,
          id_incidente: incidenteId
        };
        resp = await fetch(`${API_URL}/api/supervisor/maint/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify(data)
        });
      }
      if (resp.ok) {
        alert(editId ? 'Mantenimiento actualizado' : 'Mantenimiento programado');
        hideModal();
        updateSummary();
      } else {
        const text = await resp.text();
        let errorMsg = `Error ${resp.status}: ${resp.statusText}`;
        try {
          const errorData = JSON.parse(text);
          errorMsg += ' - ' + (errorData.message || 'Error desconocido');
        } catch (e) {
          errorMsg += ' - ' + text.substring(0, 200);
        }
        alert(errorMsg);
      }
    } catch (err) {
      alert('Error de red o del servidor. Intenta de nuevo.');
      console.error(err);
    }
  });


  // similares funcionalidades de menú y logout reutilizamos de dashboardSupervisor
  function activarEnlaceMenu() {
    const current = window.location.pathname.toLowerCase();
    document.querySelectorAll('.menu-link').forEach(link => {
      link.classList.remove('bg-teal-700/60', 'text-white', 'font-semibold');
      const href = link.getAttribute('href')?.toLowerCase() || '';
      if (current.includes(href)) {
        link.classList.add('bg-teal-700/60', 'text-white', 'font-semibold');
      }
    });
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

  function configurarIconos() {
    const bell = document.getElementById('btnNotifications');
    if (bell) bell.addEventListener('click', () => { /*redirige?*/ });
    const userBtn = document.getElementById('btnUser');
    if (userBtn) userBtn.addEventListener('click', () => alert('Perfil de usuario (próximamente)'));
  }

  activarEnlaceMenu();
  configurarLogout();
  configurarIconos();
});
