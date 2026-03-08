const API_URL = "http://localhost:3000";

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

// 1. Estado operativo
async function cargarEstadoOperativo() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/reportes/estado-operativo`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();

  const div = document.getElementById("estadoOperativo");
  div.innerHTML = `
    <h3 class="font-bold">Estaciones</h3>
    <ul>${data.estaciones.map(e => `<li>${e.nombre} - ${e.estado}</li>`).join("")}</ul>
    <h3 class="font-bold mt-2">Cabinas</h3>
    <ul>${data.cabinas.map(c => `<li>${c.codigo} - ${c.estado}</li>`).join("")}</ul>
  `;
}

// 2. Flujo por rango horario
async function cargarFlujo(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const inicio = document.getElementById("flujoInicio").value;
  const fin = document.getElementById("flujoFin").value;

  const res = await fetch(`${API_URL}/api/reportes/flujo?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("Error en reporte de flujo:", data);
    return;
  }

  const div = document.getElementById("reporteFlujo");
  div.innerHTML = `
    <table class="min-w-full bg-white/10 rounded">
      <thead><tr><th>Estación</th><th>Tipo</th><th>Total Pasajeros</th></tr></thead>
      <tbody>${data.map(r => `<tr><td>${r.estacion}</td><td>${r.tipo}</td><td>${r.total_pasajeros}</td></tr>`).join("")}</tbody>
    </table>
  `;
}

// 3. Historial de incidentes
async function cargarIncidentes(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const inicio = document.getElementById("incidentesInicio").value;
  const fin = document.getElementById("incidentesFin").value;

  const res = await fetch(`${API_URL}/api/reportes/incidentes?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("Error en reporte de incidentes:", data);
    return;
  }

  const div = document.getElementById("reporteIncidentes");
  div.innerHTML = `
    <table class="min-w-full bg-white/10 rounded">
      <thead>
        <tr>
          <th>Título</th><th>Tipo</th><th>Criticidad</th>
          <th>Estado</th><th>Fecha</th><th>Estación</th><th>Cabina</th>
          <th>Reportado por</th><th>Asignado a</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(i => `
          <tr>
            <td>${i.titulo}</td>
            <td>${i.tipo}</td>
            <td>${i.nivel_criticidad}</td>
            <td>${i.estado}</td>
            <td>${i.fecha_reporte}</td>
            <td>${i.estacion || ""}</td>
            <td>${i.cabina || ""}</td>
            <td>${i.reportado_por || ""}</td>
            <td>${i.asignado_a || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// 4. Mantenimientos
async function cargarMantenimientos(e) {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const inicio = document.getElementById("mantenimientoInicio").value;
  const fin = document.getElementById("mantenimientoFin").value;

  const res = await fetch(`${API_URL}/api/reportes/mantenimientos?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("Error en reporte de mantenimientos:", data);
    return;
  }

  const div = document.getElementById("reporteMantenimientos");
  div.innerHTML = `
    <table class="min-w-full bg-white/10 rounded">
      <thead>
        <tr>
          <th>Título</th><th>Tipo</th><th>Descripción</th>
          <th>Fecha Programada</th><th>Fecha Realizada</th><th>Estado</th>
          <th>Estación</th><th>Cabina</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td>${m.titulo_mantenimiento}</td>
            <td>${m.tipo}</td>
            <td>${m.descripcion}</td>
            <td>${m.fecha_programada || ""}</td>
            <td>${m.fecha_realizada || ""}</td>
            <td>${m.estado}</td>
            <td>${m.estacion || ""}</td>
            <td>${m.cabina || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

document.getElementById("descargarFlujo").addEventListener("click", async () => {
  const inicio = document.getElementById("flujoInicio").value;
  const fin = document.getElementById("flujoFin").value;
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/reportes/flujo/pdf?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flujo.pdf";
  a.click();
});

document.getElementById("descargarIncidentes").addEventListener("click", async () => {
  const inicio = document.getElementById("incidentesInicio").value;
  const fin = document.getElementById("incidentesFin").value;
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/reportes/incidentes/pdf?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "incidentes.pdf";
  a.click();
});

document.getElementById("descargarMantenimientos").addEventListener("click", async () => {
  const inicio = document.getElementById("mantenimientoInicio").value;
  const fin = document.getElementById("mantenimientoFin").value;
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/reportes/mantenimientos/pdf?fecha_inicio=${inicio}&fecha_fin=${fin}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mantenimientos.pdf";
  a.click();
});