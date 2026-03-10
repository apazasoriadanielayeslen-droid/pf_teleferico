const API_URL = "http://localhost:3000";
console.log("telestaciones.js cargado");

// =========================
// LOGOUT
// =========================
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  });
}

// =========================
// LISTAR TELESTACIONES
// =========================
async function cargarTelestaciones() {
  const token = localStorage.getItem("token");
  try { 
    const res = await fetch(`${API_URL}/api/telestaciones`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar estaciones");
    const telestaciones = await res.json();
    
    console.log("Estaciones recibidas:", telestaciones);

    const tbody = document.getElementById("tablaEstacionesBody");
    tbody.innerHTML = "";

    telestaciones.forEach((t, index) => {
      const row = document.createElement("tr");
      row.className = "border-b border-white/10 hover:bg-white/5 transition";
      row.innerHTML = `
        <td class="py-3 px-4">${index + 1}</td>
        <td class="py-3 px-4 font-semibold">${t.nombre}</td>
        <td class="py-3 px-4">${t.ubicacion}</td>
        <td class="py-3 px-4">${t.capacidad_maxima}</td>
        <td class="py-3 px-4">${t.horario || (t.hora_apertura + " - " + t.hora_cierre)}</td>
        <td class="py-3 px-4">
          <span class="px-3 py-1 rounded-full text-sm font-semibold ${
            t.estado === 'ACTIVA' ? 'bg-green-600' :
            t.estado === 'INACTIVA' ? 'bg-gray-600' :
            t.estado === 'MANTENIMIENTO' ? 'bg-yellow-600' :
            'bg-red-600'
          }">
            ${t.estado}
          </span>
        </td>
        <td class="py-3 px-4 text-sm">${t.encargados || "-"}</td>
        <td class="py-3 px-4 space-x-2">
          <button onclick="abrirEditarTelestacion(${t.id_estacion})"
                  class="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition text-sm font-semibold">
            ✏️ Editar
          </button>
          <button onclick="confirmarEliminarTelestacion(${t.id_estacion}, '${t.nombre}')"
                  class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm font-semibold">
            🗑️ Eliminar
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error al cargar estaciones:", err);
    alert("Error al cargar estaciones");
  }
}

// =========================
// CREAR TELESTACION
// =========================
let encargadosCrearTel = [];
async function crearTelestacion() {
  const token = localStorage.getItem("token");
  const data = {
    nombre: document.getElementById("nombre").value,
    ubicacion: document.getElementById("ubicacion").value,
    capacidad_maxima: document.getElementById("capacidad").value,
    hora_apertura: document.getElementById("hora_apertura").value,
    hora_cierre: document.getElementById("hora_cierre").value,
    estado: document.getElementById("estado").value,
    encargados: encargadosCrearTel
  };

  try {
    const res = await fetch(`${API_URL}/api/telestaciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
      alert("Estación creada correctamente");
      // Limpiar forma
      document.getElementById("formTelestacion").reset();
      encargadosCrearTel = [];
      document.getElementById("listaEncargados").innerHTML = "";
      toggleForm(); // Cerrar formulario
      cargarTelestaciones();
    } else {
      alert(result.message || "Error al crear estación");
    }
  } catch (err) {
    console.error("Error al crear telestación:", err);
    alert("Error al crear estación");
  }
}

// =========================
// EDITAR TELESTACION
// =========================
let encargadosEditTel = [];
async function abrirEditarTelestacion(id) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/telestaciones/${id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al obtener estación");
    const tel = await res.json();

    document.getElementById("editId").value = tel.id_estacion;
    document.getElementById("editNombre").value = tel.nombre;
    document.getElementById("editUbicacion").value = tel.ubicacion;
    document.getElementById("editCapacidad").value = tel.capacidad_maxima;
    document.getElementById("editHoraApertura").value = tel.hora_apertura;
    document.getElementById("editHoraCierre").value = tel.hora_cierre;
    document.getElementById("editEstado").value = tel.estado;

    // Limpiar encargados previos
    encargadosEditTel = [];
    document.getElementById("listaEncargadosEdit").innerHTML = "";

    // Si hay encargados, cargarlos en la lista
    if (tel.encargados) {
      // Parsear los encargados (vienen como "Nombre Apellido (TURNO), Nombre2 Apellido2 (TURNO2)")
      console.log("Encargados del servidor:", tel.encargados);
    }

    document.getElementById("editModal").classList.remove("hidden");
  } catch (err) {
    console.error("Error al cargar telestación:", err);
    alert("Error al cargar estación");
  }
}

function cerrarModalTel() {
  document.getElementById("editModal").classList.add("hidden");
}

document.getElementById("editForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const id = document.getElementById("editId").value;
  const data = {
    nombre: document.getElementById("editNombre").value,
    ubicacion: document.getElementById("editUbicacion").value,
    capacidad_maxima: document.getElementById("editCapacidad").value,
    hora_apertura: document.getElementById("editHoraApertura").value,
    hora_cierre: document.getElementById("editHoraCierre").value,
    estado: document.getElementById("editEstado").value,
    encargados: encargadosEditTel
  };

  try {
    const res = await fetch(`${API_URL}/api/telestaciones/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
      alert("Estación actualizada correctamente");
      cerrarModalTel();
      cargarTelestaciones();
    } else {
      alert(result.message || "Error al actualizar estación");
    }
  } catch (err) {
    console.error("Error al actualizar estación:", err);
    alert("Error al actualizar estación");
  }
});

// =========================
// ELIMINAR TELESTACION
// =========================
async function confirmarEliminarTelestacion(id, nombre) {
  if (!confirm(`¿Está seguro que desea eliminar la estación "${nombre}"? Esta acción marcará la estación como INACTIVA.`)) {
    return;
  }
  await eliminarTelestacion(id);
}

async function eliminarTelestacion(id) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/telestaciones/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await res.json();
    
    if (result.success) {
      alert("Estación marcada como INACTIVA correctamente");
      cargarTelestaciones();
    } else {
      alert(result.message || "Error al eliminar estación");
    }
  } catch (err) {
    console.error("Error al eliminar estación:", err);
    alert("Error al eliminar estación");
  }
}

// =========================
// ENCARGADOS
// =========================
function agregarEncargado() {
  const selectEncargado = document.getElementById("id_encargado");
  const selectTurno = document.getElementById("turno");
  const lista = document.getElementById("listaEncargados");

  const id_personal = selectEncargado.value;
  const nombre = selectEncargado.options[selectEncargado.selectedIndex]?.text;
  const turno = selectTurno.value;

  if (!id_personal || !turno) {
    alert("Selecciona un supervisor y un turno");
    return;
  }

  // Verificar si ya existe este supervisor con el mismo turno
  if (encargadosCrearTel.some(e => e.id_personal == id_personal && e.turno == turno)) {
    alert("Este supervisor ya fue agregado con este turno");
    return;
  }

  encargadosCrearTel.push({ id_personal, nombre, turno });

  const li = document.createElement("li");
  li.className = "flex justify-between items-center p-2 bg-white/20 rounded mb-2";
  li.innerHTML = `
    <span>${nombre} - Turno: ${turno}</span>
    <button type="button" onclick="eliminarEncargado(${id_personal}, '${turno}')" 
            class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition">
      Eliminar
    </button>
  `;
  lista.appendChild(li);

  selectEncargado.value = "";
  selectTurno.value = "";
}

function eliminarEncargado(id_personal, turno) {
  const index = encargadosCrearTel.findIndex(e => e.id_personal == id_personal && e.turno == turno);
  if (index > -1) {
    encargadosCrearTel.splice(index, 1);
    document.getElementById("listaEncargados").innerHTML = "";
    encargadosCrearTel.forEach(e => {
      const li = document.createElement("li");
      li.className = "flex justify-between items-center p-2 bg-white/20 rounded mb-2";
      li.innerHTML = `
        <span>${e.nombre} - Turno: ${e.turno}</span>
        <button type="button" onclick="eliminarEncargado(${e.id_personal}, '${e.turno}')" 
                class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition">
          Eliminar
        </button>
      `;
      document.getElementById("listaEncargados").appendChild(li);
    });
  }
}

function agregarEncargadoEdit() {
  const selectEncargado = document.getElementById("editEncargado");
  const selectTurno = document.getElementById("editTurno");
  const lista = document.getElementById("listaEncargadosEdit");

  const id_personal = selectEncargado.value;
  const nombre = selectEncargado.options[selectEncargado.selectedIndex]?.text;
  const turno = selectTurno.value;

  if (!id_personal || !turno) {
    alert("Selecciona un supervisor y un turno");
    return;
  }

  // Verificar si ya existe este supervisor con el mismo turno
  if (encargadosEditTel.some(e => e.id_personal == id_personal && e.turno == turno)) {
    alert("Este supervisor ya fue agregado con este turno");
    return;
  }

  encargadosEditTel.push({ id_personal, nombre, turno });

  const li = document.createElement("li");
  li.className = "flex justify-between items-center p-2 bg-white/20 rounded mb-2";
  li.innerHTML = `
    <span>${nombre} - Turno: ${turno}</span>
    <button type="button" onclick="eliminarEncargadoEdit(${id_personal}, '${turno}')" 
            class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition">
      Eliminar
    </button>
  `;
  lista.appendChild(li);

  selectEncargado.value = "";
  selectTurno.value = "";
}

function eliminarEncargadoEdit(id_personal, turno) {
  const index = encargadosEditTel.findIndex(e => e.id_personal == id_personal && e.turno == turno);
  if (index > -1) {
    encargadosEditTel.splice(index, 1);
    document.getElementById("listaEncargadosEdit").innerHTML = "";
    encargadosEditTel.forEach(e => {
      const li = document.createElement("li");
      li.className = "flex justify-between items-center p-2 bg-white/20 rounded mb-2";
      li.innerHTML = `
        <span>${e.nombre} - Turno: ${e.turno}</span>
        <button type="button" onclick="eliminarEncargadoEdit(${e.id_personal}, '${e.turno}')" 
                class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition">
          Eliminar
        </button>
      `;
      document.getElementById("listaEncargadosEdit").appendChild(li);
    });
  }
}

// =========================
// CARGAR SELECT ENCARGADOS
// =========================
async function cargarEncargadosSelect(selectId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/supervisores`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar supervisores");

    const supervisores = await res.json();
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = "<option value=''>-- Selecciona supervisor --</option>";

    supervisores.forEach(p => {
      if (p.estado === "ACTIVO") {
        const option = document.createElement("option");
        option.value = p.id_personal;
        option.textContent = `${p.nombres} ${p.apellido1} ${p.apellido2 || ""}`;
        select.appendChild(option);
      }
    });
  } catch (err) {
    console.error("Error al cargar supervisores:", err);
  }
}

// =========================
// INICIALIZACIÓN
// =========================
document.addEventListener("DOMContentLoaded", () => {
  cargarEncargadosSelect("id_encargado");
  cargarEncargadosSelect("editEncargado");
  cargarTelestaciones();
});

// =========================
// TOGGLE FORM
// =========================
function toggleForm() {
  const formContainer = document.getElementById("formContainer");
  formContainer.classList.toggle("hidden");
}