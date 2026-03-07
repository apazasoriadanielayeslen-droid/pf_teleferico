// dashboardOperador.js
// Lógica completa:
//   - Aforo en tiempo real (localStorage + polling)
//   - Campanita con badge que NO se pierde al navegar
//   - Modal con lista de congestiones ignoradas
//   - Tarjetas de notificaciones con botón Solucionar

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard Operador cargado");

    const API_URL             = 'http://localhost:3000';
    const token               = localStorage.getItem('token');
    const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';
    const AFORO_LIVE_KEY      = 'aforo_live';

    if (!token) {
        alert("No hay sesión activa. Inicie sesión.");
        window.location.href = 'login.html';
        return;
    }

    // Elementos del DOM
    const btnNotificaciones   = document.getElementById('btnNotificaciones');
    const modalNotificaciones = document.getElementById('modalNotificaciones');
    const modalContent        = document.getElementById('modalContent');
    const sinPendientesModal  = document.getElementById('sinPendientesModal');
    const cerrarModal         = document.getElementById('cerrarModal');
    const notifBadge          = document.getElementById('notifBadge');
    const ignoradasContainer  = document.getElementById('ignoradasContainer');
    const sinIgnoradas        = document.getElementById('sinIgnoradas');

    let capacidadEstacionActual = 1000;
    let pollingInterval         = null;
    let estacionActualId        = null;

    // ────────────────────────────────────────────────
    // 1. Nombre del usuario
    // ────────────────────────────────────────────────
    function mostrarNombreUsuario() {
        const userStr = localStorage.getItem('user');
        if (!userStr) { window.location.href = 'login.html'; return; }
        try {
            const user = JSON.parse(userStr);
            document.querySelectorAll('#nombreUsuario').forEach(el => {
                el.textContent = user.nombre?.trim() || 'Usuario';
            });
        } catch {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    // ────────────────────────────────────────────────
    // 2. Menú lateral activo
    // ────────────────────────────────────────────────
    function activarEnlaceMenu() {
        const currentPath = window.location.pathname.toLowerCase();
        document.querySelectorAll('.menu-link').forEach(link => {
            const href = link.getAttribute('href')?.toLowerCase() || '';
            link.classList.remove('bg-teal-700/60', 'text-white', 'font-semibold');
            if (href && href !== '#' && currentPath.includes(href)) {
                link.classList.add('bg-teal-700/60', 'text-white', 'font-semibold');
            }
        });
    }

    // ────────────────────────────────────────────────
    // 3. Logout
    // ────────────────────────────────────────────────
    function configurarLogout() {
        document.querySelectorAll('#btnLogout, .btn-logout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
                    if (pollingInterval) clearInterval(pollingInterval);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'login.html';
                }
            });
        });
    }

    // ════════════════════════════════════════════════════
    // CAMPANITA — misma lógica que paginapasajeros.js
    // El badge persiste porque siempre consulta la BD
    // al cargar la página, sin importar desde dónde llegues
    // ════════════════════════════════════════════════════

    // ────────────────────────────────────────────────
    // 4. Actualizar el badge (número rojo en la campanita)
    //    Usa el mismo endpoint que paginapasajeros:
    //    GET /api/notificaciones/ignoradas
    // ────────────────────────────────────────────────
    async function actualizarBadge() {
        try {
            const res = await fetch(`${API_URL}/api/notificaciones/ignoradas`, {
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

            // Actualizar resumen rápido
            const elResNotifs = document.getElementById('resumenNotifs');
            if (elResNotifs) {
                elResNotifs.textContent = notifs.length > 0
                    ? `${notifs.length} pendiente(s)`
                    : 'Ninguna';
                elResNotifs.className = notifs.length > 0
                    ? 'font-bold text-red-400'
                    : 'font-bold text-green-400';
            }
        } catch (err) {
            console.error("Error actualizando badge:", err);
            notifBadge.classList.add('hidden');
        }
    }

    // ────────────────────────────────────────────────
    // 5. Clic en campanita → abrir modal con la lista
    // ────────────────────────────────────────────────
    btnNotificaciones.addEventListener('click', async () => {
        modalNotificaciones.classList.remove('hidden');
        await cargarNotificacionesModal();
        await actualizarBadge();
    });

    cerrarModal.addEventListener('click', () => modalNotificaciones.classList.add('hidden'));
    modalNotificaciones.addEventListener('click', (e) => {
        if (e.target === modalNotificaciones) modalNotificaciones.classList.add('hidden');
    });

    // ────────────────────────────────────────────────
    // 6. Contenido del MODAL de la campanita
    // ────────────────────────────────────────────────
    async function cargarNotificacionesModal() {
        modalContent.innerHTML = '<p class="text-center text-gray-400 py-4">Cargando...</p>';
        sinPendientesModal.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}/api/notificaciones/ignoradas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.status);
            const notifs = await res.json();

            modalContent.innerHTML = '';

            if (notifs.length === 0) {
                sinPendientesModal.classList.remove('hidden');
                return;
            }

            notifs.forEach(notif => {
                const item = document.createElement('div');
                item.className = 'bg-red-900/40 border border-red-700/40 p-4 rounded-xl cursor-pointer hover:bg-red-800/50 transition';
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
                // Clic en item del modal → cerrar modal y hacer scroll a las tarjetas
                item.addEventListener('click', () => {
                    modalNotificaciones.classList.add('hidden');
                    document.getElementById('ignoradasContainer')
                        ?.scrollIntoView({ behavior: 'smooth' });
                });
                modalContent.appendChild(item);
            });

        } catch (err) {
            console.error("Error cargando modal:", err);
            modalContent.innerHTML = '<p class="text-red-400 text-center">Error al cargar notificaciones.</p>';
        }
    }

    // ────────────────────────────────────────────────
    // 7. Tarjetas de notificaciones ignoradas en la PÁGINA
    //    (sección inferior, igual que paginapasajeros)
    // ────────────────────────────────────────────────
    async function cargarNotificacionesPagina() {
        try {
            const res = await fetch(`${API_URL}/api/notificaciones/ignoradas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.status);
            const notifs = await res.json();

            ignoradasContainer.innerHTML = '';

            if (notifs.length === 0) {
                sinIgnoradas.classList.remove('hidden');
                return;
            }

            sinIgnoradas.classList.add('hidden');

            notifs.forEach(notif => {
                const attemptedEntrantes = parseInt(notif.mensaje.match(/\d+/)?.[0]) || 0;
                agregarTarjetaNotificacion({
                    id_notificacion:    notif.id_notificacion,
                    id_incidente:       notif.id_incidente,
                    estacion:           notif.estacion || 'Desconocida',
                    attemptedEntrantes,
                    fecha:              notif.fecha
                });
            });

        } catch (err) {
            console.error("Error cargando tarjetas:", err);
        }
    }

    // ────────────────────────────────────────────────
    // 8. Crear tarjeta individual con botón Solucionar
    // ────────────────────────────────────────────────
    function agregarTarjetaNotificacion(data) {
        const card = document.createElement('div');
        card.className = 'bg-red-900/60 backdrop-blur-xl border border-red-700/50 rounded-xl p-5 shadow-lg';
        card.setAttribute('data-id-notif', data.id_notificacion);
        card.innerHTML = `
            <div class="flex items-center gap-3 mb-3">
                <svg class="w-6 h-6 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h3 class="text-lg font-bold">Congestión Ignorada</h3>
            </div>
            <p class="text-sm mb-1">Estación: <span class="font-medium text-white">${data.estacion}</span></p>
            <p class="text-sm mb-1">Pasajeros intentados: <span class="font-medium text-orange-300">${data.attemptedEntrantes}</span></p>
            <p class="text-sm mb-1 text-gray-300">📅 ${new Date(data.fecha).toLocaleString('es-BO')}</p>
            <p class="text-sm mb-4 text-yellow-300 font-medium">Estado: Pendiente</p>
            <div class="flex justify-end">
                <button class="solucionar-btn bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition"
                        data-id-notif="${data.id_notificacion}"
                        data-id-inc="${data.id_incidente}">
                    Solucionar
                </button>
            </div>
        `;

        ignoradasContainer.appendChild(card);

        card.querySelector('.solucionar-btn').addEventListener('click', async function () {
            const btn     = this;
            const idNotif = btn.dataset.idNotif;
            const idInc   = btn.dataset.idInc;

            btn.textContent = 'Solucionando...';
            btn.disabled    = true;

            try {
                // Usa el mismo endpoint que paginapasajeros.js
                const res = await fetch(`${API_URL}/api/notificaciones/solucionar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_notificacion: idNotif, id_incidente: idInc })
                });

                const result = await res.json();

                if (res.ok && result.ok) {
                    btn.textContent = 'Solucionado ✓';
                    btn.classList.remove('bg-green-600', 'hover:bg-green-500');
                    btn.classList.add('bg-gray-500', 'cursor-not-allowed');

                    setTimeout(async () => {
                        card.remove();
                        if (ignoradasContainer.children.length === 0) {
                            sinIgnoradas.classList.remove('hidden');
                        }
                        // Actualizar badge inmediatamente
                        await actualizarBadge();
                    }, 1500);
                } else {
                    btn.textContent = 'Error – reintentar';
                    btn.disabled    = false;
                }
            } catch (err) {
                console.error("Error al solucionar:", err);
                btn.textContent = 'Error – reintentar';
                btn.disabled    = false;
            }
        });
    }

    // ════════════════════════════════════════════════
    // AFORO EN TIEMPO REAL
    // ════════════════════════════════════════════════

    function marcarActualizacion() {
        const el = document.getElementById('ultimaActualizacion');
        if (el) el.textContent = new Date().toLocaleTimeString('es-BO', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    function renderizarTarjetaAforo(datos) {
        const { aforoActual, capacidad, porc, totalEntradas } = datos;
        const get = id => document.getElementById(id);

        if (get('aforoActualValor')) get('aforoActualValor').textContent = aforoActual.toLocaleString('es-BO');
        if (get('capacidadValor'))   get('capacidadValor').textContent   = capacidad.toLocaleString('es-BO');
        if (get('aforoPorcentaje'))  get('aforoPorcentaje').textContent  = porc;
        if (get('aforoProgressBar')) get('aforoProgressBar').style.width = `${porc}%`;
        if (get('resumenPorc'))      get('resumenPorc').textContent      = `${porc}%`;
        if (get('resumenTotal'))     get('resumenTotal').textContent     = (totalEntradas || 0).toLocaleString('es-BO');

        const bar     = get('aforoProgressBar');
        const mensaje = get('aforoMensaje');
        const status  = get('aforoStatus');
        const resEst  = get('resumenEstado');

        if (porc < 70) {
            if (bar)    bar.style.background = 'linear-gradient(to right, #10b981, #34d399)';
            if (status) status.innerHTML     = `<span class="bg-green-600 text-white px-6 py-1.5 rounded-full">Normal</span>`;
            if (mensaje){ mensaje.innerHTML  = ''; mensaje.className = 'mt-5 text-center text-base md:text-lg font-medium min-h-[32px]'; }
            if (resEst) { resEst.textContent = 'Normal'; resEst.className = 'font-bold text-green-400'; }
        } else if (porc < 90) {
            if (bar)    bar.style.background = 'linear-gradient(to right, #eab308, #f59e0b)';
            if (status) status.innerHTML     = `<span class="bg-yellow-600 text-white px-6 py-1.5 rounded-full">Congestión Moderada</span>`;
            if (mensaje){ mensaje.innerHTML  = '⚠️ Congestión moderada - Monitorear el flujo'; mensaje.className = 'mt-5 text-center text-base md:text-lg font-medium text-yellow-300'; }
            if (resEst) { resEst.textContent = 'Congestión Moderada'; resEst.className = 'font-bold text-yellow-400'; }
        } else {
            if (bar)    bar.style.background = 'linear-gradient(to right, #ef4444, #f87171)';
            if (status) status.innerHTML     = `<span class="bg-red-600 text-white px-6 py-1.5 rounded-full">CRÍTICA</span>`;
            if (mensaje){ mensaje.innerHTML  = '🚨 ¡CONGESTIÓN CRÍTICA! Tomar medidas inmediatas'; mensaje.className = 'mt-5 text-center text-base md:text-lg font-medium text-red-300'; }
            if (resEst) { resEst.textContent = 'CRÍTICA'; resEst.className = 'font-bold text-red-400'; }
        }

        marcarActualizacion();
    }

    async function inicializar() {
        try {
            const res = await fetch(`${API_URL}/api/estaciones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.status);
            const estaciones = await res.json();
            if (!estaciones.length) return;

            const ultimaId = localStorage.getItem(ULTIMA_ESTACION_KEY);
            const est = estaciones.find(e => String(e.id_estacion) === String(ultimaId)) || estaciones[0];

            capacidadEstacionActual = Number(est.capacidad_maxima) || 1000;
            estacionActualId = est.id_estacion;

            const headerEl = document.getElementById('nombreEstacionHeader');
            if (headerEl) headerEl.textContent = est.nombre;

            // Leer aforo desde localStorage (si la simulación ya está corriendo en otra pestaña)
            const raw = localStorage.getItem(AFORO_LIVE_KEY);
            if (raw) renderizarTarjetaAforo(JSON.parse(raw));
            else {
                // Si no hay cache, consultar el servidor directamente
                const r2 = await fetch(`${API_URL}/api/flujo/hoy?id_estacion=${est.id_estacion}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const flujos = await r2.json();
                let aforoActual = 0, totalEntradas = 0;
                flujos.forEach(f => {
                    aforoActual   += Number(f.entrantes || 0) - Number(f.salientes || 0);
                    totalEntradas += Number(f.entrantes || 0);
                });
                const porc = Math.min(100, Math.max(0, Math.round((aforoActual / capacidadEstacionActual) * 100)));
                renderizarTarjetaAforo({ aforoActual, capacidad: capacidadEstacionActual, porc, totalEntradas });
            }

            // Storage event → actualización instantánea desde paginapasajeros
            window.addEventListener('storage', (event) => {
                if (event.key === AFORO_LIVE_KEY && event.newValue) {
                    try { renderizarTarjetaAforo(JSON.parse(event.newValue)); } catch {}
                }
            });

            // Polling de respaldo cada 8 segundos
            pollingInterval = setInterval(async () => {
                const r = await fetch(`${API_URL}/api/flujo/hoy?id_estacion=${estacionActualId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const flujos = await r.json();
                let aforoActual = 0, totalEntradas = 0;
                flujos.forEach(f => {
                    aforoActual   += Number(f.entrantes || 0) - Number(f.salientes || 0);
                    totalEntradas += Number(f.entrantes || 0);
                });
                const porc = Math.min(100, Math.max(0, Math.round((aforoActual / capacidadEstacionActual) * 100)));
                renderizarTarjetaAforo({ aforoActual, capacidad: capacidadEstacionActual, porc, totalEntradas });

                // También refrescar badge y tarjetas cada 8 segundos
                await actualizarBadge();
                await cargarNotificacionesPagina();
            }, 8000);

        } catch (err) {
            console.error("Error al inicializar:", err);
        }
    }

    // ────────────────────────────────────────────────
    // Arrancar todo
    // ────────────────────────────────────────────────
    mostrarNombreUsuario();
    configurarLogout();
    activarEnlaceMenu();
    inicializar();

    // Cargar campanita y tarjetas AL ENTRAR A LA PÁGINA
    // Esto garantiza que el conteo no se pierda aunque navegues
    actualizarBadge();
    cargarNotificacionesPagina();

    window.addEventListener('beforeunload', () => {
        if (pollingInterval) clearInterval(pollingInterval);
    });
});