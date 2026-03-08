const API_URL = "http://localhost:3000";

// Cargar estaciones en la tabla
async function cargarEstaciones() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/estaciones`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar estaciones");

    const estaciones = await res.json();
    const tbody = document.getElementById("tablaEstacionesBody");
    tbody.innerHTML = "";

    estaciones.forEach((e, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${e.nombre}</td>
        <td>${e.ubicacion}</td>
        <td>${e.capacidad_maxima}</td>
        <td>${e.horario}</td>
        <td>${e.estado}</td>
        <td>${e.encargados || ""}</td>
        <td>
          <button class="bg-blue-600 text-white px-2 py-1 rounded mr-2" onclick="editarEstacion(${e.id_estacion})">Editar</button>
          <button class="bg-red-600 text-white px-2 py-1 rounded" onclick="eliminarEstacion(${e.id_estacion})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error al cargar estaciones:", err);
  }
}

// Botón Crear
function toggleForm() {
  const formContainer = document.getElementById("formContainer");
  formContainer.classList.toggle("hidden");
}

// Crear estación
async function crearEstacion() {
  const token = localStorage.getItem("token");
  const data = {
    nombre: document.getElementById("nombre").value,
    ubicacion: document.getElementById("ubicacion").value,
    capacidad_maxima: document.getElementById("capacidad").value,
    hora_apertura: document.getElementById("hora_apertura").value,
    hora_cierre: document.getElementById("hora_cierre").value,
    estado: document.getElementById("estado").value,
    encargados: encargadosCrear // 👈 enviamos array de encargados
  };

  try {
    const res = await fetch(`${API_URL}/api/estaciones`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    alert(result.message);

    // Reset lista y array
    encargadosCrear = [];
    document.getElementById("listaEncargados").innerHTML = "";

    cargarEstaciones();
  } catch (err) {
    console.error("Error al crear estación:", err);
  }
}

// Abrir modal de edición
async function editarEstacion(id) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/estaciones/${id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al obtener estación");

    const estacion = await res.json();

    // Rellenar campos del modal
    document.getElementById("editId").value = estacion.id_estacion;
    document.getElementById("editNombre").value = estacion.nombre;
    document.getElementById("editUbicacion").value = estacion.ubicacion;
    document.getElementById("editCapacidad").value = estacion.capacidad_maxima;
    document.getElementById("editHoraApertura").value = estacion.hora_apertura;
    document.getElementById("editHoraCierre").value = estacion.hora_cierre;
    document.getElementById("editEstado").value = estacion.estado;

    // Reset lista de encargados
    encargadosEdit = [];
    document.getElementById("listaEncargadosEdit").innerHTML = "";

    // Mostrar modal
    document.getElementById("editModal").classList.remove("hidden");
  } catch (err) {
    console.error("Error al cargar estación:", err);
  }
}

// Cerrar modal
function cerrarModal() {
  document.getElementById("editModal").classList.add("hidden");
}

// Array temporal para encargados en edición
let encargadosEdit = [];

// Agregar encargado en el modal de edición
function agregarEncargadoEdit() {
  const selectEncargado = document.getElementById("editEncargado");
  const selectTurno = document.getElementById("editTurno");
  const lista = document.getElementById("listaEncargadosEdit");

  const id_personal = selectEncargado.value;
  const nombre = selectEncargado.options[selectEncargado.selectedIndex]?.text;
  const turno = selectTurno.value;

  if (!id_personal || !turno) {
    alert("Selecciona un encargado y un turno");
    return;
  }

  // Guardar en array temporal
  encargadosEdit.push({ id_personal, nombre, turno });

  // Mostrar en la lista
  const li = document.createElement("li");
  li.textContent = `${nombre} (${turno})`;
  lista.appendChild(li);

  // Reset selects
  selectEncargado.value = "";
  selectTurno.value = "";
}

// Guardar cambios desde el modal
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");

  const data = {
    nombre: document.getElementById("editNombre").value,
    ubicacion: document.getElementById("editUbicacion").value,
    capacidad_maxima: document.getElementById("editCapacidad").value,
    hora_apertura: document.getElementById("editHoraApertura").value,
    hora_cierre: document.getElementById("editHoraCierre").value,
    estado: document.getElementById("editEstado").value,
    encargados: encargadosEdit // 👈 enviamos array de encargados
  };

  try {
    const res = await fetch(`${API_URL}/api/estaciones/${document.getElementById("editId").value}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    alert(result.message);
    cerrarModal();
    cargarEstaciones();
  } catch (err) {
    console.error("Error al actualizar estación:", err);
  }
});

// Eliminar estación
async function eliminarEstacion(id) {
  const token = localStorage.getItem("token");
  if (!confirm("¿Seguro que deseas eliminar esta estación?")) return;

  try {
    const res = await fetch(`${API_URL}/api/estaciones/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await res.json();
    alert(result.message);
    cargarEstaciones();
  } catch (err) {
    console.error("Error al eliminar estación:", err);
  }
}

// Cargar encargados en un select
async function cargarEncargadosSelect(selectId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/personal`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar encargados");

    const personal = await res.json();
    const select = document.getElementById(selectId);
    select.innerHTML = "<option value=''>-- Selecciona encargado --</option>";

    personal.forEach(p => {
      if (p.estado === "ACTIVO") {
        const option = document.createElement("option");
        option.value = p.id_personal;
        option.textContent = `${p.nombres} ${p.apellido1} ${p.apellido2 || ""}`;
        select.appendChild(option);
      }
    });
  } catch (err) {
    console.error("Error al cargar encargados:", err);
  }
}

// Array temporal para encargados en creación
let encargadosCrear = [];

// Agregar encargado en el formulario de creación
function agregarEncargado() {
  const selectEncargado = document.getElementById("id_encargado");
  const selectTurno = document.getElementById("turno");
  const lista = document.getElementById("listaEncargados");

  const id_personal = selectEncargado.value;
  const nombre = selectEncargado.options[selectEncargado.selectedIndex]?.text;
  const turno = selectTurno.value;

  if (!id_personal || !turno) {
    alert("Selecciona un encargado y un turno");
    return;
  }

  // Guardar en array temporal
  encargadosCrear.push({ id_personal, nombre, turno });

  // Mostrar en la lista
  const li = document.createElement("li");
  li.textContent = `${nombre} (${turno})`;
  lista.appendChild(li);

  // Reset selects
  selectEncargado.value = "";
  selectTurno.value = "";
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  cargarEncargadosSelect("id_encargado"); // formulario de creación
  cargarEncargadosSelect("editEncargado"); // formulario de edición
  cargarEstaciones(); // tabla
});