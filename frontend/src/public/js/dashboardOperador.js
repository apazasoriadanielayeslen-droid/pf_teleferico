// dashboardOperador.js
// Versión mejorada: nombre usuario + logout + menú lateral dinámico + chequeos

document.addEventListener('DOMContentLoaded', () => {
  console.log("Dashboard Operador cargado – inicializando funcionalidades");

  // ────────────────────────────────────────────────
  // 1. Mostrar nombre del usuario (en todos los lugares)
  // ────────────────────────────────────────────────
  function mostrarNombreUsuario() {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      console.warn("No hay usuario en localStorage → redirigiendo a login");
      window.location.href = 'login.html';
      return;
    }

    try {
      const user = JSON.parse(userStr);
      const nombre = user.nombre?.trim() || 'Usuario';

      // Actualiza TODOS los elementos con id="nombreUsuario"
      document.querySelectorAll('#nombreUsuario').forEach(el => {
        el.textContent = nombre;
      });

      // Si existe un elemento específico para el turno o responsable
      const turnoEl = document.getElementById('nombreUsuarioTurno');
      if (turnoEl) turnoEl.textContent = nombre;

      console.log(`Nombre mostrado: ${nombre}`);
    } catch (err) {
      console.error("Error al parsear usuario:", err);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  }

  // ────────────────────────────────────────────────
  // 2. Hacer el menú lateral dinámico (resaltar enlace activo)
  // ────────────────────────────────────────────────
  function activarEnlaceMenu() {
    const currentPath = window.location.pathname.toLowerCase();
    const menuLinks = document.querySelectorAll('.menu-link');

    menuLinks.forEach(link => {
      const href = link.getAttribute('href')?.toLowerCase() || '';

      // Remueve clase activa de todos
      link.classList.remove('bg-teal-700/60', 'text-white', 'font-semibold');

      // Compara la ruta actual con el href del enlace
      if (currentPath.includes(href) || (href === '#' && currentPath.includes('dashboard'))) {
        link.classList.add('bg-teal-700/60', 'text-white', 'font-semibold');
      }
    });

    console.log("Menú lateral actualizado – enlace activo resaltado");
  }

  // ────────────────────────────────────────────────
  // 3. Configurar cierre de sesión (soporta varios botones)
  // ────────────────────────────────────────────────
  function configurarLogout() {
    const logoutButtons = document.querySelectorAll('#btnLogout, #btnLogoutMobile, .btn-logout');

    logoutButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Puedes agregar más limpiezas si usas otras keys
          console.log("Sesión cerrada exitosamente");
          window.location.href = 'login.html';
        }
      });
    });

    if (logoutButtons.length === 0) {
      console.warn("No se encontraron botones de logout");
    }
  }

  // ────────────────────────────────────────────────
  // Inicialización principal
  // ────────────────────────────────────────────────
  mostrarNombreUsuario();
  configurarLogout();
  activarEnlaceMenu();

  // Opcional: si quieres recargar el menú cuando cambie la página (para SPA)
  window.addEventListener('popstate', activarEnlaceMenu);
});

// ────────────────────────────────────────────────
// Reutilización de lógica de Aforo desde paginapasajeros.js
// ────────────────────────────────────────────────
const API_URL = 'http://localhost:3000';  // Copia de paginapasajeros
const token = localStorage.getItem('token');  // Copia
let capacidadEstacionActual = 1000;  // Default, se actualiza con estación
const ULTIMA_ESTACION_KEY = 'ultima_estacion_seleccionada';  // Copia si usas

if (!token) {
  alert("No hay sesión activa. Inicie sesión.");
  window.location.href = "login.html";
  return;
}

// Función copiada: Cargar estaciones (para obtener capacidad)
async function cargarEstaciones() {
  try {
    const res = await fetch(`${API_URL}/api/estaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(res.status);
    const estaciones = await res.json();

    // Asumimos que el operador tiene una estación fija (o única). Si múltiples, ajusta.
    if (estaciones.length > 0) {
      const ultimaId = localStorage.getItem(ULTIMA_ESTACION_KEY) || estaciones[0].id_estacion;
      const est = estaciones.find(e => e.id_estacion == ultimaId) || estaciones[0];
      capacidadEstacionActual = Number(est.capacidad_maxima) || 1000;
      localStorage.setItem(ULTIMA_ESTACION_KEY, est.id_estacion);

      // Actualiza nombre de estación en HTML si quieres (opcional)
      document.querySelector('h2.text-3xl.font-bold').textContent = est.nombre;  // Reemplaza "Estación Centro"

      cargarHistorial(est.id_estacion);  // Carga datos para la tarjeta
    } else {
      console.error("No hay estaciones disponibles");
    }
  } catch (err) {
    console.error("Error cargando estaciones:", err);
  }
}

// Función copiada y simplificada: Cargar historial (solo para obtener flujos y actualizar tarjeta)
async function cargarHistorial(id_estacion) {
  if (!id_estacion) return;
  try {
    const res = await fetch(`${API_URL}/api/flujo/hoy?id_estacion=${id_estacion}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    actualizarAforoCard(data);  // Solo actualiza la tarjeta (no necesitas renderHistorial aquí)
  } catch (err) {
    console.error("Error historial:", err);
  }
}

// Función clave copiada: Actualizar la tarjeta de aforo
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
    document.getElementById('aforoMensaje').className = 'mt-6 text-center text-lg font-medium text-yellow-300';
  } else {
    progressBar.style.background = 'linear-gradient(to right, #ef4444, #f87171)';
    statusHTML = `<span class="bg-red-600 text-white px-6 py-1.5 rounded-full">CRÍTICA</span>`;
    mensaje = '🚨 ¡CONGESTIÓN CRÍTICA! Riesgo de saturación - Tomar medidas inmediatas';
    document.getElementById('aforoMensaje').classList.remove('hidden');
    document.getElementById('aforoMensaje').innerHTML = mensaje;
    document.getElementById('aforoMensaje').className = 'mt-6 text-center text-lg font-medium text-red-300';
  }

  document.getElementById('aforoStatus').innerHTML = statusHTML;
}

// Inicialización: Agrega esto al final de DOMContentLoaded existente
cargarEstaciones();  // Carga al iniciar el dashboard