// Iniciar Sesion
document.addEventListener("DOMContentLoaded", () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        document.getElementById("nombreUsuario").textContent = user.nombre || "Usuario";
        document.getElementById("rolUsuario").textContent = "Rol: " + (user.rol_nombre || "Administrador");
      } else {
        window.location.href = "login.html";
      }
    });

// Cerrar Sesion
document.addEventListener("DOMContentLoaded", () => {
    const btnLogout = document.getElementById("btnLogout");

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        // ✅ Eliminar sesión
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // ✅ Redirigir al login
        window.location.href = "login.html";
      });
    }
  });

// Cargar Datos de Panel 
    async function cargarPanel() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3000/panel", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("No autorizado");
        const data = await response.json();

        const statsContainer = document.getElementById("stats");
        statsContainer.innerHTML = `
          <div class="bg-white/10 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-2">Estaciones</h3>
            <p>Activas: ${data.estaciones.find(e => e.estado === 'ACTIVA')?.total || 0}</p>
            <p>Inactivas: ${data.estaciones.find(e => e.estado === 'INACTIVA')?.total || 0}</p>
            <p>En mantenimiento: ${data.estaciones.find(e => e.estado === 'MANTENIMIENTO')?.total || 0}</p>
            <p>Bloqueadas: ${data.estaciones.find(e => e.estado === 'BLOQUEADA')?.total || 0}</p>
          </div>
          <div class="bg-white/10 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-2">Cabinas</h3>
            <p>En servicio: ${data.cabinas.find(c => c.estado === 'EN_SERVICIO')?.total || 0}</p>
            <p>Fuera de servicio: ${data.cabinas.find(c => c.estado === 'FUERA_SERVICIO')?.total || 0}</p>
            <p>En mantenimiento: ${data.cabinas.find(c => c.estado === 'MANTENIMIENTO')?.total || 0}</p>
            <p>Bloqueadas: ${data.cabinas.find(c => c.estado === 'BLOQUEADA')?.total || 0}</p>
          </div>
          <div class="bg-white/10 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-2">Incidentes</h3>
            <p>Abiertos: ${data.incidentes.find(i => i.estado === 'ABIERTO')?.total || 0}</p>
            <p>En proceso: ${data.incidentes.find(i => i.estado === 'EN_PROCESO')?.total || 0}</p>
            <p>Resueltos: ${data.incidentes.find(i => i.estado === 'RESUELTO')?.total || 0}</p>
            <p>Cancelados: ${data.incidentes.find(i => i.estado === 'CANCELADO')?.total || 0}</p>
          </div>
          <div class="bg-white/10 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-2">Mantenimientos</h3>
            <p>Pendientes: ${data.mantenimientos.find(m => m.estado === 'PENDIENTE')?.total || 0}</p>
            <p>En proceso: ${data.mantenimientos.find(m => m.estado === 'EN_PROCESO')?.total || 0}</p>
            <p>Finalizados: ${data.mantenimientos.find(m => m.estado === 'FINALIZADO')?.total || 0}</p>
            <p>Cancelados: ${data.mantenimientos.find(m => m.estado === 'CANCELADO')?.total || 0}</p>
          </div>
          <div class="bg-white/10 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-semibold mb-2">Usuarios</h3>
            <p>Activos: ${data.usuarios.find(u => u.estado === 'ACTIVO')?.total || 0}</p>
            <p>Inactivos: ${data.usuarios.find(u => u.estado === 'INACTIVO')?.total || 0}</p>
          </div>
        `;

      const flujoStats = document.getElementById("flujoStats");
      flujoStats.innerHTML = `
        <div class="bg-white/10 p-4 rounded-lg">
          <p class="text-lg">Entradas</p>
          <p class="text-2xl font-bold">${data.flujo.find(f => f.tipo === 'ENTRADA')?.total || 0}</p>
        </div>
        <div class="bg-white/10 p-4 rounded-lg">
          <p class="text-lg">Salidas</p>
          <p class="text-2xl font-bold">${data.flujo.find(f => f.tipo === 'SALIDA')?.total || 0}</p>
        </div>
      `;
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
      if (error.message === "No autorizado") {
        window.location.href = "login.html";
      }
    }
  }

  cargarPanel();