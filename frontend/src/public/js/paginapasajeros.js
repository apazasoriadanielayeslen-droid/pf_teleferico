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
    const entrantesInput = document.getElementById('entrantesInput');
    const salientesInput = document.getElementById('salientesInput');
    const registrarBtn   = document.getElementById('registrarBtn');
    const historialTbody = document.getElementById('historialTbody');
    const horaActualSpan = document.getElementById('horaActual');

    const CAPACIDAD_ESTACION = 1000;
    const MAX_ENTRADA_POR_HORA = 1500; // 150 cabinas × 10 personas

    const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';

    // Actualizar hora actual cada minuto
    function actualizarHora() {
        const now = new Date();
        const horas = now.getHours().toString().padStart(2, '0');
        const minutos = now.getMinutes().toString().padStart(2, '0');
        horaActualSpan.textContent = `${horas}:${minutos}`;
    }
    actualizarHora();
    setInterval(actualizarHora, 60000);

    // Cargar estaciones
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

            // Restaurar última selección
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

    // Cargar historial
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
        } catch (err) {
            console.error("Error historial:", err);
            historialTbody.innerHTML = '<tr><td colspan="5" class="py-4 px-4 text-center text-red-400">Error al cargar historial</td></tr>';
        }
    }

    // Renderizar tabla con resaltado de límites
    function renderHistorial(flujos) {
        historialTbody.innerHTML = '';
        let aforoAcumulado = 0;

        flujos.forEach(flujo => {
            const neto = flujo.entrantes - flujo.salientes;
            aforoAcumulado += neto;

            const porcAforo = (aforoAcumulado / CAPACIDAD_ESTACION) * 100;
            let tendencia = '';
            let color = '';
            if (porcAforo < 50) {
                tendencia = '↓ Baja ocupación';
                color = 'text-green-400';
            } else if (porcAforo < 80) {
                tendencia = '↔ Media ocupación';
                color = 'text-yellow-400';
            } else {
                tendencia = '↑ Alta ocupación';
                color = 'text-red-400';
            }

            let filaClass = 'border-b border-white/10 hover:bg-white/5';
            let notaLimite = '';
            if (flujo.entrantes > MAX_ENTRADA_POR_HORA) {
                filaClass += ' bg-red-900/50';
                notaLimite = ' (¡Límite superado!)';
            } else if (flujo.entrantes > MAX_ENTRADA_POR_HORA * 0.8) {
                filaClass += ' bg-yellow-900/30';
                notaLimite = ' (Cerca del límite)';
            }

            const fila = `
                <tr class="${filaClass}">
                    <td class="py-4 px-4">${flujo.hora}:00</td>
                    <td class="py-4 px-4">${flujo.entrantes}</td>
                    <td class="py-4 px-4">${flujo.salientes}</td>
                    <td class="py-4 px-4">${neto >= 0 ? '+' : ''}${neto}</td>
                    <td class="py-4 px-4 ${color}">${tendencia}${notaLimite}</td>
                </tr>
            `;
            historialTbody.innerHTML += fila;
        });

        if (flujos.length === 0) {
            historialTbody.innerHTML = '<tr><td colspan="5" class="py-4 px-4 text-center text-gray-400">No hay registros hoy</td></tr>';
        }
    }

    // Actualizar tarjetas
    async function actualizarTarjetas(flujos, id_estacion) {
        if (flujos.length === 0) {
            document.getElementById('totalHoyValor').textContent = '0';
            document.getElementById('ultimaHoraValor').textContent = '0';
            document.getElementById('ultimaHoraRango').textContent = 'Sin datos';
            document.getElementById('picoValor').textContent = '0';
            document.getElementById('picoHora').textContent = 'N/A';
            document.getElementById('promedioValor').textContent = '0';
            return;
        }

        // Total Hoy (entrantes)
        const totalHoy = flujos.reduce((sum, f) => sum + f.entrantes, 0);

        // Pico del día
        let pico = 0;
        let picoHora = 0;
        flujos.forEach(f => {
            if (f.entrantes > pico) {
                pico = f.entrantes;
                picoHora = f.hora;
            }
        });
        const picoTexto = `${picoHora < 10 ? '0' : ''}${picoHora}:00 ${picoHora < 12 ? 'AM' : 'PM'}`;

        // Última hora registrada
        const ultima = flujos[flujos.length - 1];
        const ultimaValor = ultima.entrantes;
        const ultimaRango = `${ultima.hora < 10 ? '0' : ''}${ultima.hora}:00 - ${(ultima.hora + 1) % 24 < 10 ? '0' : ''}${(ultima.hora + 1) % 24}:00`;

        // Promedio últimas 5 horas
        const ult5 = flujos.slice(-5);
        const prom = ult5.length ? Math.round(ult5.reduce((s, f) => s + f.entrantes, 0) / ult5.length) : 0;

        // Actualizar DOM
        document.getElementById('totalHoyValor').textContent = totalHoy.toLocaleString('es-BO');
        document.getElementById('ultimaHoraValor').textContent = ultimaValor.toLocaleString('es-BO');
        document.getElementById('ultimaHoraRango').textContent = ultimaRango;
        document.getElementById('picoValor').textContent = pico.toLocaleString('es-BO');
        document.getElementById('picoHora').textContent = picoTexto;
        document.getElementById('promedioValor').textContent = prom.toLocaleString('es-BO');

        // % vs ayer (opcional)
        try {
            const res = await fetch(`${API_URL}/api/flujo/ayer?id_estacion=${id_estacion}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const ayer = await res.json();
                const totAyer = ayer.reduce((s, f) => s + f.entrantes, 0);
                const porc = totAyer > 0 ? Math.round(((totalHoy - totAyer) / totAyer) * 100) : 0;
                const signo = porc >= 0 ? '+' : '';
                document.getElementById('totalHoyPorc').textContent = `${signo}${porc}% vs ayer`;
                document.getElementById('totalHoyPorc').className = `text-xs ${porc >= 0 ? 'text-green-400' : 'text-red-400'} mt-1`;
            }
        } catch (e) {
            document.getElementById('totalHoyPorc').textContent = 'N/A vs ayer';
        }
    }

    // Registrar flujo
    registrarBtn.addEventListener('click', async () => {
        const id_estacion = estacionSelect.value;
        let entrantes = Number(entrantesInput.value) || 0;
        let salientes = Number(salientesInput.value) || 0;

        if (!id_estacion) return alert("Seleccione una estación");
        if (entrantes === 0 && salientes === 0) return alert("Ingrese al menos entradas o salidas");

        if (entrantes > MAX_ENTRADA_POR_HORA) {
            alert(`No puede registrar más de ${MAX_ENTRADA_POR_HORA} entrantes por operación (límite horario).`);
            return;
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

            if (!res.ok) {
                alert(data.message || "Error al registrar");
                return;
            }

            alert("Flujo registrado correctamente");
            entrantesInput.value = 0;
            salientesInput.value = 0;

            cargarHistorial(id_estacion);
            localStorage.setItem(ULTIMA_ESTACION_KEY, id_estacion);

        } catch (err) {
            console.error(err);
            alert("Error de conexión");
        }
    });

    // Cambio de estación
    estacionSelect.addEventListener('change', () => {
        const id = estacionSelect.value;
        if (id) {
            localStorage.setItem(ULTIMA_ESTACION_KEY, id);
            cargarHistorial(id);
        } else {
            localStorage.removeItem(ULTIMA_ESTACION_KEY);
            historialTbody.innerHTML = '';
        }
    });

    // Inicio
    cargarEstaciones();
});