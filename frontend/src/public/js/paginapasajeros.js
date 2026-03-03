document.addEventListener('DOMContentLoaded', () => {
    console.log("paginapasajeros.js iniciado");

    const API_URL = 'http://localhost:3000';
    const token = localStorage.getItem('token');

    if (!token) {
        alert("No hay sesión activa. Inicie sesión.");
        window.location.href = "login.html";
        return;
    }

    const estacionSelect = document.getElementById('estacionSelect');
    const toggleSimulacionBtn = document.getElementById('toggleSimulacionBtn');
    const historialTbody = document.getElementById('historialTbody');
    const horaActualSpan = document.getElementById('horaActual');
    const estadoSimulacion = document.getElementById('estadoSimulacion');
    const alertaCongestion = document.getElementById('alertaCongestion');

    const CAPACIDAD_ESTACION = 1000;
    const MAX_PASAJEROS_POR_CABINA = 10;
    const MAX_ENTRADA_POR_HORA = 4500; // Aumentado para que no rechace tanto

    const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';

    let simulacionTimeout = null;
    let simulacionActiva = false;

    function actualizarHora() {
        const now = new Date();
        horaActualSpan.textContent = now.toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit'});
    }
    actualizarHora();
    setInterval(actualizarHora, 60000);

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
                estacionSelect.appendChild(opt);
            });

            const ultima = localStorage.getItem(ULTIMA_ESTACION_KEY);
            if (ultima && estaciones.some(e => e.id_estacion == ultima)) {
                estacionSelect.value = ultima;
                cargarHistorial(ultima);
            }
        } catch (err) {
            console.error("Error estaciones:", err);
            estacionSelect.innerHTML = '<option value="">Error al cargar estaciones</option>';
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

            const porcAforo = (aforoAcumulado / CAPACIDAD_ESTACION) * 100;
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

        const totalHoy = flujos.reduce((sum, f) => sum + f.entrantes, 0);

        let pico = 0, picoHora = 0;
        flujos.forEach(f => { if (f.entrantes > pico) { pico = f.entrantes; picoHora = f.hora; }});
        const picoTexto = `${picoHora < 10 ? '0' : ''}${picoHora}:00 ${picoHora < 12 ? 'AM' : 'PM'}`;

        const ultima = flujos[flujos.length - 1];
        const ultimaValor = ultima.entrantes;
        const ultimaRango = `${ultima.hora < 10 ? '0' : ''}${ultima.hora}:00 - ${(ultima.hora + 1) % 24 < 10 ? '0' : ''}${(ultima.hora + 1) % 24}:00`;

        document.getElementById('totalHoyValor').textContent = totalHoy.toLocaleString('es-BO');
        document.getElementById('ultimaHoraValor').textContent = ultimaValor.toLocaleString('es-BO');
        document.getElementById('ultimaHoraRango').textContent = ultimaRango;
        document.getElementById('picoValor').textContent = pico.toLocaleString('es-BO');
        document.getElementById('picoHora').textContent = picoTexto;
    }

    function verificarCongestion(flujos) {
        let aforo = 0;
        flujos.forEach(f => aforo += f.entrantes - f.salientes);
        alertaCongestion.classList.toggle('hidden', aforo <= CAPACIDAD_ESTACION);
    }

    // ===================== SIMULACIÓN =====================
    async function simularYRegistrarFlujo(id_estacion) {
        // Flujo normal: números pequeños
        let entrantes = Math.floor(Math.random() * 7) + 2;   // 2–8
        let salientes = Math.floor(Math.random() * (entrantes + 1)); // nunca más que entrantes

        // Congestión ocasional (~5% probabilidad)
        let idNotificacion = null;
        const hayCongestion = Math.random() < 0.05;

        if (hayCongestion) {
            const entrantesOriginal = Math.floor(Math.random() * 5) + 11; // 11–15
            entrantes = entrantesOriginal;

            console.log(`[CONGESTIÓN] Intentando ${entrantesOriginal} entrantes`);

            // Limitar a 10 pasajeros por cabina
            entrantes = MAX_PASAJEROS_POR_CABINA;

            estadoSimulacion.textContent = `¡Congestión! (${entrantesOriginal} pasajeros intentaron entrar)`;

            // Crear notificación en BD
            try {
                const resNotif = await fetch(`${API_URL}/api/notificaciones/crear-congestion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id_personal: localStorage.getItem('id_personal') || 1, // ← CAMBIA POR EL ID REAL DEL USUARIO
                        mensaje: `Congestión detectada en estación ${id_estacion}: ${entrantesOriginal} pasajeros en un intervalo (límite 10 por cabina)`
                    })
                });

                const dataNotif = await resNotif.json();
                if (resNotif.ok && dataNotif.id_notificacion) {
                    idNotificacion = dataNotif.id_notificacion;
                    mostrarAlertaCongestion(idNotificacion);
                }
            } catch (err) {
                console.error("Error creando notificación:", err);
            }
        }

        // Registrar el flujo (con entrantes limitado si hubo congestión)
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
                const nextInterval = Math.floor(Math.random() * 90000) + 45000; // 45–135 seg
                simulacionTimeout = setTimeout(() => simularYRegistrarFlujo(id_estacion), nextInterval);
            }
        }
    }

    // Mostrar alerta con botón "Solucionar"
    function mostrarAlertaCongestion(idNotificacion) {
        const contenedor = document.querySelector('.p-6.max-w-7xl') || document.body;
        const alerta = document.createElement('div');
        alerta.id = `alerta-${idNotificacion}`;
        alerta.className = 'bg-red-900/80 text-white p-4 rounded-lg mb-6 flex justify-between items-center shadow-lg';
        alerta.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p><strong>¡CONGESTIÓN DETECTADA!</strong> Más de 10 pasajeros en un intervalo.</p>
            </div>
            <button id="btnSolucionar-${idNotificacion}" class="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-medium transition">
                Solucionar
            </button>
        `;

        contenedor.prepend(alerta);

        document.getElementById(`btnSolucionar-${idNotificacion}`).addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_URL}/api/notificaciones/solucionar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ id_notificacion: idNotificacion })
                });

                if (res.ok) {
                    alerta.classList.remove('bg-red-900/80');
                    alerta.classList.add('bg-green-900/70');
                    alerta.innerHTML = `<p class="text-green-200 flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        Congestión solucionada ✓
                    </p>`;
                    setTimeout(() => alerta.remove(), 6000);
                } else {
                    alert("No se pudo marcar como solucionada");
                }
            } catch (err) {
                console.error("Error al solucionar:", err);
                alert("Error de conexión");
            }
        });
    }

    toggleSimulacionBtn.addEventListener('click', () => {
        const id_estacion = estacionSelect.value;
        if (!id_estacion) return alert("Seleccione una estación primero");

        simulacionActiva = !simulacionActiva;

        if (simulacionActiva) {
            toggleSimulacionBtn.textContent = 'Detener Simulación';
            toggleSimulacionBtn.classList.add('bg-emerald-600');
            estadoSimulacion.textContent = 'Simulación activa...';
            simularYRegistrarFlujo(id_estacion);
        } else {
            toggleSimulacionBtn.textContent = 'Iniciar Simulación';
            toggleSimulacionBtn.classList.remove('bg-emerald-600');
            estadoSimulacion.textContent = 'Simulación detenida.';
            clearTimeout(simulacionTimeout);
        }
    });

    estacionSelect.addEventListener('change', () => {
        const id = estacionSelect.value;
        if (id) {
            localStorage.setItem(ULTIMA_ESTACION_KEY, id);
            cargarHistorial(id);
            if (simulacionActiva) toggleSimulacionBtn.click();
        } else {
            localStorage.removeItem(ULTIMA_ESTACION_KEY);
            historialTbody.innerHTML = '';
            alertaCongestion.classList.add('hidden');
        }
    });

    cargarEstaciones();
});