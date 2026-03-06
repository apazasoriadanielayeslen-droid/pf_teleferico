document.addEventListener('DOMContentLoaded', () => {
    console.log("paginapasajeros.js iniciado");

    const API_URL = 'http://localhost:3000';
    const token = localStorage.getItem('token');

    if (!token) {
        alert("No hay sesión activa. Inicie sesión.");
        window.location.href = "login.html";
        return;
    }

    // Elementos del DOM
    const estacionSelect = document.getElementById('estacionSelect');
    const toggleSimulacionBtn = document.getElementById('toggleSimulacionBtn');
    const historialTbody = document.getElementById('historialTbody');
    const horaActualSpan = document.getElementById('horaActual');
    const estadoSimulacion = document.getElementById('estadoSimulacion');
    const alertaCongestion = document.getElementById('alertaCongestion');
    const alertaCongestionTarjeta = document.getElementById('alertaCongestionTarjeta');
    const mensajeCongestion = document.getElementById('mensajeCongestion');
    const btnIgnorarCongestion = document.getElementById('btnIgnorarCongestion');
    const btnConfirmarCongestion = document.getElementById('btnConfirmarCongestion');
    const ignoradasContainer = document.getElementById('ignoradasContainer');
    const sinIgnoradas = document.getElementById('sinIgnoradas');
    const estacionActualSpan = document.getElementById('estacionActual');
    const btnNotificaciones = document.getElementById('btnNotificaciones');
    const modalNotificaciones = document.getElementById('modalNotificaciones');
    const modalContent = document.getElementById('modalContent');
    const sinPendientesModal = document.getElementById('sinPendientesModal');
    const cerrarModal = document.getElementById('cerrarModal');
    const notifBadge = document.getElementById('notifBadge');

    const MAX_PASAJEROS_POR_CABINA = 10;
    const MAX_ENTRADA_POR_HORA = 4500;

    let capacidadEstacionActual = 1000;
    const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';
    const SIMULACION_ACTIVA_KEY = 'simulacionActiva';
    const SIMULACION_ESTACION_KEY = 'simulacionEstacionId';

    let simulacionTimeout = null;
    let simulacionActiva = false;
    let tempCongestionData = null;

    // ────────────────────────────────────────────────
    // Funciones básicas
    // ────────────────────────────────────────────────
    function actualizarHora() {
        const now = new Date();
        horaActualSpan.textContent = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    }
    actualizarHora();
    setInterval(actualizarHora, 60000);

    // ────────────────────────────────────────────────
    // Cargar estaciones y seleccionar la última
    // ────────────────────────────────────────────────
    async function cargarEstaciones() {
        try {
            const res = await fetch(`${API_URL}/api/estaciones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.status);
            const estaciones = await res.json();

            estacionSelect.innerHTML = '<option value="">-- Seleccione una estación --</option>';

            estaciones.forEach(est => {
                const opt = document.createElement('option');
                opt.value = est.id_estacion;
                opt.textContent = est.nombre;
                opt.dataset.capacidad = est.capacidad_maxima || 1000;
                estacionSelect.appendChild(opt);
            });

            // Seleccionar última estación guardada o la primera
            let idSeleccionada;
            const ultimaId = localStorage.getItem(ULTIMA_ESTACION_KEY);

            if (ultimaId && estaciones.some(e => e.id_estacion == ultimaId)) {
                idSeleccionada = ultimaId;
            } else if (estaciones.length > 0) {
                idSeleccionada = estaciones[0].id_estacion;
                localStorage.setItem(ULTIMA_ESTACION_KEY, idSeleccionada);
            }

            if (idSeleccionada) {
                estacionSelect.value = idSeleccionada;
                const est = estaciones.find(e => e.id_estacion == idSeleccionada);
                capacidadEstacionActual = Number(est?.capacidad_maxima) || 1000;
                estacionActualSpan.textContent = est?.nombre || 'Estación seleccionada';
                cargarHistorial(idSeleccionada);
            }
        } catch (err) {
            console.error("Error estaciones:", err);
            estacionSelect.innerHTML = '<option value="">Error al cargar estaciones</option>';
            estacionActualSpan.textContent = 'Error al cargar estación';
        }
    }

    // ────────────────────────────────────────────────
    // Cambio de estación → cargar datos + detener simulación si estaba activa
    // ────────────────────────────────────────────────
    estacionSelect.addEventListener('change', () => {
        const id = estacionSelect.value;
        if (id) {
            const selectedOpt = estacionSelect.options[estacionSelect.selectedIndex];
            const nombre = selectedOpt.text;
            capacidadEstacionActual = Number(selectedOpt.dataset.capacidad) || 1000;
            estacionActualSpan.textContent = nombre;
            localStorage.setItem(ULTIMA_ESTACION_KEY, id);
            cargarHistorial(id);

            // Si la simulación estaba activa → la detenemos al cambiar estación
            if (simulacionActiva) {
                simulacionActiva = false;
                toggleSimulacionBtn.textContent = 'Iniciar Simulación';
                toggleSimulacionBtn.classList.remove('bg-emerald-600');
                estadoSimulacion.textContent = 'Simulación detenida por cambio de estación';
                clearTimeout(simulacionTimeout);
                localStorage.setItem(SIMULACION_ACTIVA_KEY, 'false');
                localStorage.removeItem(SIMULACION_ESTACION_KEY);
            }

            alertaCongestionTarjeta.classList.add('hidden');
        } else {
            estacionActualSpan.textContent = 'Seleccione una estación';
            localStorage.removeItem(ULTIMA_ESTACION_KEY);
            historialTbody.innerHTML = '';
            alertaCongestion.classList.add('hidden');
        }
    });

    // ────────────────────────────────────────────────
    // Resto de funciones (actualizarBadge, notificaciones, historial, etc.)
    // ────────────────────────────────────────────────
    async function actualizarBadge() {
        try {
            const res = await fetch(`${API_URL}/api/notificaciones/ignoradas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error en la respuesta del servidor');
            const notifs = await res.json();

            if (notifs.length > 0) {
                notifBadge.textContent = notifs.length;
                notifBadge.classList.remove('hidden');
            } else {
                notifBadge.classList.add('hidden');
            }
        } catch (err) {
            console.error("Error actualizando badge:", err);
            notifBadge.classList.add('hidden');
        }
    }

    btnNotificaciones.addEventListener('click', async () => {
        modalNotificaciones.classList.remove('hidden');
        await cargarNotificacionesIgnoradas();
        await actualizarBadge();
    });

    cerrarModal.addEventListener('click', () => modalNotificaciones.classList.add('hidden'));
    modalNotificaciones.addEventListener('click', (e) => {
        if (e.target === modalNotificaciones) modalNotificaciones.classList.add('hidden');
    });

    async function cargarNotificacionesIgnoradas() {
        try {
            const res = await fetch(`${API_URL}/api/notificaciones/ignoradas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error en la respuesta del servidor');
            const notifs = await res.json();

            modalContent.innerHTML = '';
            if (notifs.length === 0) {
                sinPendientesModal.classList.remove('hidden');
                return;
            }

            sinPendientesModal.classList.add('hidden');

            notifs.forEach(notif => {
                const item = document.createElement('div');
                item.className = 'bg-red-900/40 p-4 rounded-lg cursor-pointer hover:bg-red-800/50 transition';
                item.innerHTML = `
                    <p class="font-medium">${notif.titulo}</p>
                    <p class="text-sm text-gray-300">${notif.mensaje}</p>
                    <p class="text-xs text-gray-400 mt-1">Estación: ${notif.estacion || 'N/A'} - ${new Date(notif.fecha).toLocaleString('es-BO')}</p>
                `;
                item.addEventListener('click', () => {
                    modalNotificaciones.classList.add('hidden');
                    document.querySelector('.bg-white\\/5:last-child').scrollIntoView({ behavior: 'smooth' });
                });
                modalContent.appendChild(item);
            });
        } catch (err) {
            console.error("Error cargando notificaciones:", err);
            modalContent.innerHTML = '<p class="text-red-400 text-center">Error al cargar notificaciones.</p>';
        }
    }

    async function cargarHistorial(id_estacion) {
        if (!id_estacion) return;
        try {
            const res = await fetch(`${API_URL}/api/flujo/hoy?id_estacion=${id_estacion}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            renderHistorial(data);
            actualizarTarjetas(data, id_estacion);
            actualizarAforoCard(data);
            verificarCongestion(data);
        } catch (err) {
            console.error("Error historial:", err);
            historialTbody.innerHTML = '<tr><td colspan="5" class="py-4 px-4 text-center text-red-400">Error al cargar historial</td></tr>';
            alertaCongestion.classList.add('hidden');
        }
    }

    function renderHistorial(flujos) {
        historialTbody.innerHTML = '';
        let aforoAcumulado = 0;

        flujos.forEach(flujo => {
            const neto = flujo.entrantes - flujo.salientes;
            aforoAcumulado += neto;

            const porcAforo = (aforoAcumulado / capacidadEstacionActual) * 100;
            let tendencia = porcAforo < 50 ? '↓ Baja' : porcAforo < 80 ? '↔ Media' : '↑ Alta';
            let color = porcAforo < 50 ? 'text-green-400' : porcAforo < 80 ? 'text-yellow-400' : 'text-red-400';

            const fila = `
                <tr class="border-b border-white/10 hover:bg-white/5">
                    <td class="py-4 px-4">${flujo.hora}:00</td>
                    <td class="py-4 px-4">${flujo.entrantes}</td>
                    <td class="py-4 px-4">${flujo.salientes}</td>
                    <td class="py-4 px-4">${neto >= 0 ? '+' : ''}${neto}</td>
                    <td class="py-4 px-4 ${color}">${tendencia}</td>
                </tr>
            `;
            historialTbody.innerHTML += fila;
        });

        if (flujos.length === 0) {
            historialTbody.innerHTML = '<tr><td colspan="5" class="py-4 px-4 text-center text-gray-400">No hay registros hoy</td></tr>';
        }
    }

    async function actualizarTarjetas(flujos, id_estacion) {
        if (flujos.length === 0) {
            document.getElementById('totalHoyValor').textContent = '0';
            document.getElementById('ultimaHoraValor').textContent = '0';
            document.getElementById('ultimaHoraRango').textContent = 'Sin datos';
            document.getElementById('picoValor').textContent = '0';
            document.getElementById('picoHora').textContent = 'N/A';
            document.getElementById('totalHoyPorc').textContent = '+0% vs ayer';
            return;
        }

        const totalHoy = flujos.reduce((sum, f) => sum + Number(f.entrantes || 0), 0);

        let pico = 0;
        let picoHora = 0;

        flujos.forEach(f => {
            const entrantesNum = Number(f.entrantes || 0);
            if (entrantesNum > pico) {
                pico = entrantesNum;
                picoHora = Number(f.hora);
            }
        });

        const formatHora = (h24) => {
            const h = h24 % 24;
            const ampm = h < 12 ? 'AM' : 'PM';
            const hh = h % 12 || 12;
            return `${hh < 10 ? '0' : ''}${hh}:00 ${ampm}`;
        };

        const picoTexto = formatHora(picoHora);

        const ultima = flujos[flujos.length - 1];
        const ultimaValor = Number(ultima.entrantes || 0);
        const ultimaRango = `${ultima.hora < 10 ? '0' : ''}${ultima.hora}:00 - ${(ultima.hora + 1) % 24 < 10 ? '0' : ''}${(ultima.hora + 1) % 24}:00`;

        document.getElementById('totalHoyValor').textContent = totalHoy.toLocaleString('es-BO');
        document.getElementById('ultimaHoraValor').textContent = ultimaValor.toLocaleString('es-BO');
        document.getElementById('ultimaHoraRango').textContent = ultimaRango;
        document.getElementById('picoValor').textContent = pico.toLocaleString('es-BO');
        document.getElementById('picoHora').textContent = picoTexto;
    }

    function actualizarAforoCard(flujos) {
        if (!flujos || flujos.length === 0) {
            document.getElementById('aforoActualValor').textContent = '0';
            document.getElementById('aforoPorcentaje').textContent = '0';
            document.getElementById('aforoProgressBar').style.width = '0%';
            document.getElementById('aforoMensaje').classList.add('hidden');
            document.getElementById('aforoStatus').innerHTML = '';
            return;
        }

        let aforoActual = 0;
        flujos.forEach(f => {
            aforoActual += Number(f.entrantes || 0) - Number(f.salientes || 0);
        });

        const porc = capacidadEstacionActual > 0 
            ? Math.min(100, Math.max(0, Math.round((aforoActual / capacidadEstacionActual) * 100))) 
            : 0;

        document.getElementById('aforoActualValor').textContent = aforoActual.toLocaleString('es-BO');
        document.getElementById('capacidadValor').textContent = capacidadEstacionActual.toLocaleString('es-BO');
        document.getElementById('aforoPorcentaje').textContent = porc;

        const progressBar = document.getElementById('aforoProgressBar');
        progressBar.style.width = `${porc}%`;

        let mensaje = '';
        let statusHTML = '';

        if (porc < 70) {
            progressBar.style.background = 'linear-gradient(to right, #10b981, #34d399)';
            statusHTML = `<span class="bg-green-600 text-white px-6 py-1.5 rounded-full">Normal</span>`;
            document.getElementById('aforoMensaje').classList.add('hidden');
        } else if (porc < 90) {
            progressBar.style.background = 'linear-gradient(to right, #eab308, #f59e0b)';
            statusHTML = `<span class="bg-yellow-600 text-white px-6 py-1.5 rounded-full">Congestión Moderada</span>`;
            mensaje = '⚠️ ¡Atención! Congestión moderada - Monitorear el flujo de pasajeros';
            document.getElementById('aforoMensaje').classList.remove('hidden');
            document.getElementById('aforoMensaje').innerHTML = mensaje;
            document.getElementById('aforoMensaje').className = 'mt-5 text-center text-base md:text-lg font-medium text-yellow-300';
        } else {
            progressBar.style.background = 'linear-gradient(to right, #ef4444, #f87171)';
            statusHTML = `<span class="bg-red-600 text-white px-6 py-1.5 rounded-full">CRÍTICA</span>`;
            mensaje = '🚨 ¡CONGESTIÓN CRÍTICA! Riesgo de saturación - Tomar medidas inmediatas';
            document.getElementById('aforoMensaje').classList.remove('hidden');
            document.getElementById('aforoMensaje').innerHTML = mensaje;
            document.getElementById('aforoMensaje').className = 'mt-5 text-center text-base md:text-lg font-medium text-red-300';
            alertaCongestion.classList.remove('hidden');
        }

        document.getElementById('aforoStatus').innerHTML = statusHTML;
    }

    function verificarCongestion(flujos) {
        let aforo = 0;
        flujos.forEach(f => aforo += Number(f.entrantes || 0) - Number(f.salientes || 0));
        alertaCongestion.classList.toggle('hidden', aforo <= capacidadEstacionActual);
    }

    // ────────────────────────────────────────────────
    // SIMULACIÓN - Función principal de registro
    // ────────────────────────────────────────────────
    async function simularYRegistrarFlujo(id_estacion) {
        let entrantes = Math.floor(Math.random() * 4);
        let salientes = Math.floor(Math.random() * (entrantes + 1));

        const hayCongestion = Math.random() < 0.05;
        let attempted = entrantes;

        if (hayCongestion) {
            attempted = Math.floor(Math.random() * 5) + 11;
            entrantes = attempted;
            console.log(`[CONGESTIÓN DETECTADA] Intentando ${attempted} entrantes`);
        }

        try {
            const res = await fetch(`${API_URL}/api/registrar-flujo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id_estacion: Number(id_estacion), entrantes, salientes })
            });

            const data = await res.json();

            if (data.isCongestion) {
                mensajeCongestion.textContent = 
                    `¡Congestión detectada! Se intentaron registrar ${data.attemptedEntrantes} pasajeros (límite: 10 por cabina). ¿Registrar incidente?`;
                alertaCongestionTarjeta.classList.remove('hidden');
                estadoSimulacion.textContent = "Esperando decisión del operador...";

                tempCongestionData = {
                    id_estacion: id_estacion,
                    attemptedEntrantes: data.attemptedEntrantes
                };
                return;
            }

            if (!res.ok) {
                estadoSimulacion.textContent = `Rechazado: ${data.message || 'límite horario'}`;
                return;
            }

            console.log(`Flujo registrado → Entrantes: ${entrantes} | Salientes: ${salientes}`);
            cargarHistorial(id_estacion);

        } catch (err) {
            console.error("Error de red:", err);
            estadoSimulacion.textContent = 'Error de conexión – reintentando...';
        } finally {
            if (simulacionActiva) {
                const nextInterval = Math.floor(Math.random() * 3500) + 1500;
                console.log(`Próximo en ${(nextInterval / 1000).toFixed(1)}s`);
                simulacionTimeout = setTimeout(() => simularYRegistrarFlujo(id_estacion), nextInterval);
            }
        }
    }

    // ────────────────────────────────────────────────
    // Confirmar / Ignorar congestión (sin cambios)
    // ────────────────────────────────────────────────
    async function confirmarCongestion() {
        if (!tempCongestionData) return;

        try {
            const res = await fetch(`${API_URL}/api/confirmar-congestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_estacion: tempCongestionData.id_estacion,
                    attemptedEntrantes: tempCongestionData.attemptedEntrantes
                })
            });

            const result = await res.json();

            if (res.ok && result.ok) {
                alertaCongestionTarjeta.classList.add('hidden');
                estadoSimulacion.textContent = 'Congestión registrada como atendida y resuelta inmediatamente.';
                cargarHistorial(estacionSelect.value);
            } else {
                estadoSimulacion.textContent = result.message || 'Error al registrar el incidente.';
            }
        } catch (err) {
            console.error("Error confirmando congestión:", err);
            estadoSimulacion.textContent = 'Error de conexión al confirmar.';
        } finally {
            tempCongestionData = null;
        }
    }

    async function ignorarCongestion() {
        if (!tempCongestionData) return;

        try {
            const res = await fetch(`${API_URL}/api/ignorar-congestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_estacion: tempCongestionData.id_estacion,
                    attemptedEntrantes: tempCongestionData.attemptedEntrantes
                })
            });

            const result = await res.json();

            if (res.ok && result.ok) {
                alertaCongestionTarjeta.classList.add('hidden');
                estadoSimulacion.textContent = 'Congestión ignorada y registrada como pendiente.';
                agregarNotificacionIgnorada(result);
                await actualizarBadge();
            } else {
                estadoSimulacion.textContent = result.message || 'Error al ignorar congestión.';
            }
        } catch (err) {
            console.error("Error ignorando congestión:", err);
            estadoSimulacion.textContent = 'Error de conexión al ignorar.';
        } finally {
            tempCongestionData = null;
        }
    }

    function agregarNotificacionIgnorada(data) {
        sinIgnoradas.classList.add('hidden');

        const card = document.createElement('div');
        card.className = 'bg-red-900/60 backdrop-blur-xl border border-red-700/50 rounded-xl p-5 shadow-lg';
        card.setAttribute('data-id-notif', data.id_notificacion);
        card.innerHTML = `
            <div class="flex items-center gap-3 mb-3">
                <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h3 class="text-lg font-bold">Congestión Ignorada</h3>
            </div>
            <p class="text-sm mb-2">Estación: ${data.estacion || 'Desconocida'}</p>
            <p class="text-sm mb-2">Intentaron: ${data.attemptedEntrantes} pasajeros</p>
            <p class="text-sm mb-4 text-gray-300">Estado: Pendiente</p>
            <div class="flex justify-end">
                <button class="solucionar-btn bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition"
                    data-id-notif="${data.id_notificacion}"
                    data-id-inc="${data.id_incidente}">
                    Solucionar
                </button>
            </div>
        `;

        ignoradasContainer.appendChild(card);

        card.querySelector('.solucionar-btn').addEventListener('click', async function() {
            const btn = this;
            const idNotif = btn.dataset.idNotif;
            const idInc = btn.dataset.idInc;

            try {
                const res = await fetch(`${API_URL}/api/notificaciones/solucionar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_notificacion: idNotif, id_incidente: idInc })
                });

                const result = await res.json();

                if (res.ok) {
                    btn.textContent = 'Solucionado ✓';
                    btn.disabled = true;
                    btn.classList.remove('bg-green-600', 'hover:bg-green-500');
                    btn.classList.add('bg-gray-500', 'cursor-not-allowed');
                    estadoSimulacion.textContent = 'Notificación marcada como solucionada.';
                    
                    setTimeout(async () => {
                        card.remove();
                        if (ignoradasContainer.children.length === 0) {
                            sinIgnoradas.classList.remove('hidden');
                        }
                        await actualizarBadge();
                    }, 1500);
                } else {
                    estadoSimulacion.textContent = result.message || 'Error al solucionar.';
                }
            } catch (err) {
                console.error("Error al solucionar:", err);
                estadoSimulacion.textContent = 'Error de conexión.';
            }
        });
    }

    // ────────────────────────────────────────────────
    // Botón Iniciar/Detener Simulación + GUARDAR ESTADO
    // ────────────────────────────────────────────────
    toggleSimulacionBtn.addEventListener('click', () => {
        const id_estacion = estacionSelect.value;
        if (!id_estacion) return alert("Seleccione una estación primero");

        simulacionActiva = !simulacionActiva;

        if (simulacionActiva) {
            toggleSimulacionBtn.textContent = 'Detener Simulación';
            toggleSimulacionBtn.classList.add('bg-emerald-600');
            estadoSimulacion.textContent = 'Simulación activa...';

            // Guardar estado en localStorage
            localStorage.setItem(SIMULACION_ACTIVA_KEY, 'true');
            localStorage.setItem(SIMULACION_ESTACION_KEY, id_estacion);

            simularYRegistrarFlujo(id_estacion);
        } else {
            toggleSimulacionBtn.textContent = 'Iniciar Simulación';
            toggleSimulacionBtn.classList.remove('bg-emerald-600');
            estadoSimulacion.textContent = 'Simulación detenida.';

            // Limpiar estado guardado
            localStorage.setItem(SIMULACION_ACTIVA_KEY, 'false');
            localStorage.removeItem(SIMULACION_ESTACION_KEY);

            clearTimeout(simulacionTimeout);
        }
    });

    btnConfirmarCongestion.addEventListener('click', confirmarCongestion);
    btnIgnorarCongestion.addEventListener('click', ignorarCongestion);

    // ────────────────────────────────────────────────
    // Restaurar simulación al cargar la página
    // ────────────────────────────────────────────────
    const simulacionGuardada = localStorage.getItem(SIMULACION_ACTIVA_KEY) === 'true';
    const estacionGuardada = localStorage.getItem(SIMULACION_ESTACION_KEY);

    if (simulacionGuardada && estacionGuardada) {
        // Esperamos un momento a que se carguen las estaciones
        setTimeout(() => {
            if (estacionSelect.options.length > 1) {  // ya cargadas
                if (estacionSelect.querySelector(`option[value="${estacionGuardada}"]`)) {
                    estacionSelect.value = estacionGuardada;
                    // Disparamos evento change para actualizar todo
                    const changeEvent = new Event('change');
                    estacionSelect.dispatchEvent(changeEvent);

                    simulacionActiva = true;
                    toggleSimulacionBtn.textContent = 'Detener Simulación';
                    toggleSimulacionBtn.classList.add('bg-emerald-600');
                    estadoSimulacion.textContent = 'Simulación restaurada automáticamente';

                    simularYRegistrarFlujo(estacionGuardada);
                } else {
                    estadoSimulacion.textContent = 'Estación anterior no disponible. Seleccione una nueva.';
                    localStorage.setItem(SIMULACION_ACTIVA_KEY, 'false');
                    localStorage.removeItem(SIMULACION_ESTACION_KEY);
                }
            }
        }, 800); // pequeño retraso para dar tiempo a cargar estaciones
    }

    // Limpieza al salir de la página
    window.addEventListener('beforeunload', () => {
        if (simulacionActiva) {
            clearTimeout(simulacionTimeout);
        }
    });

    // Inicio
    actualizarBadge();
    cargarEstaciones();
});