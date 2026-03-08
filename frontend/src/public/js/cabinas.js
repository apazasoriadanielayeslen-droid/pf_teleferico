const API_URL = "http://localhost:3000";

function toggleForm() {
  document.getElementById("formContainer").classList.toggle("hidden");
}

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

async function cargarCabinas() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/cabinas`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const cabinas = await res.json();

  if (!Array.isArray(cabinas)) {
    console.error("Error al cargar cabinas:", cabinas);
    return;
  }

  const tbody = document.getElementById("cabinasTable");
  tbody.innerHTML = cabinas.map(c => `
    <tr class="border-b border-white/20">
      <td class="py-2 px-4">${c.id_cabina}</td>
      <td class="py-2 px-4">${c.codigo}</td>
      <td class="py-2 px-4">${c.capacidad_maxima}</td>
      <td class="py-2 px-4">${c.estado}</td>
      <td class="py-2 px-4">${c.estacion_nombre || "Sin asignar"}</td>
      <td class="py-2 px-4 flex gap-2">
        <button onclick="abrirModal(${c.id_cabina}, '${c.codigo}', ${c.capacidad_maxima}, '${c.estado}', ${c.id_estacion || null})" 
                class="bg-blue-500 text-white px-3 py-1 rounded">Editar</button>
        <button onclick="eliminarCabina(${c.id_cabina})" 
                class="bg-red-500 text-white px-3 py-1 rounded">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

async function cargarEstacionesSelect(selectId = "id_estacion", selectedId = null) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/estaciones`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const estaciones = await res.json();

  if (!Array.isArray(estaciones)) {
    console.error("Error al cargar estaciones:", estaciones);
    return;
  }

  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Sin estación</option>' +
    estaciones.map(e => 
      `<option value="${e.id_estacion}" ${e.id_estacion === selectedId ? "selected" : ""}>${e.nombre}</option>`
    ).join("");
}

function abrirModal(id, codigo, capacidad_maxima, estado, id_estacion) {
  document.getElementById("editId").value = id;
  document.getElementById("editCodigo").value = codigo;
  document.getElementById("editCapacidad").value = capacidad_maxima;
  document.getElementById("editEstado").value = estado;
  cargarEstacionesSelect("editEstacion", id_estacion);
  document.getElementById("editModal").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("editModal").classList.add("hidden");
}

document.getElementById("createForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const formData = {
    codigo: document.getElementById("codigo").value,
    capacidad_maxima: parseInt(document.getElementById("capacidad_maxima").value),
    estado: document.getElementById("estado").value,
    id_estacion: parseInt(document.getElementById("id_estacion").value) || null
  };
  await fetch(`${API_URL}/api/cabinas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(formData)
  });
  cargarCabinas();
  toggleForm();
});

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const id = document.getElementById("editId").value;
  const formData = {
    codigo: document.getElementById("editCodigo").value,
    capacidad_maxima: parseInt(document.getElementById("editCapacidad").value),
    estado: document.getElementById("editEstado").value,
    id_estacion: parseInt(document.getElementById("editEstacion").value) || null
  };
  await fetch(`${API_URL}/api/cabinas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(formData)
  });
  cerrarModal();
  cargarCabinas();
});

async function eliminarCabina(id) {
  const token = localStorage.getItem("token");
  if (confirm("¿Seguro que deseas eliminar esta cabina?")) {
    await fetch(`${API_URL}/api/cabinas/${id}`, { 
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    cargarCabinas();
  }
}

// Inicialización
cargarCabinas();
cargarEstacionesSelect();