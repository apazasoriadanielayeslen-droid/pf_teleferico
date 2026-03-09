const API_URL = "http://localhost:3000";

// Variables globales para paginación y pestañas
let currentPage = 1;
const limit = 5;
let currentEstado = "ACTIVO";

// ✅ Verificar token al cargar
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
  cambiarEstado("ACTIVO"); // inicia mostrando usuarios activos

  // Enganchar formulario de registro
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", registrarUsuario);
  }

  // Botón de logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }
});

// ✅ Mostrar mensajes
function mostrarMensaje(tipo, texto) {
  const errorDiv = document.getElementById("errorMsg");
  const successDiv = document.getElementById("successMsg");

  if (tipo === "error") {
    errorDiv.textContent = texto;
    errorDiv.classList.remove("hidden");
    successDiv.classList.add("hidden");
  } else {
    successDiv.textContent = texto;
    successDiv.classList.remove("hidden");
    errorDiv.classList.add("hidden");
  }
}

// ✅ Cambiar pestaña (Activos/Inactivos)
function cambiarEstado(estado) {
  currentEstado = estado;
  currentPage = 1;

  // actualizar estilos de pestañas
  document.getElementById("tabActivos").className =
    estado === "ACTIVO" ? "bg-green-600 text-white px-4 py-2 rounded" : "bg-gray-600 text-white px-4 py-2 rounded";
  document.getElementById("tabInactivos").className =
    estado === "INACTIVO" ? "bg-green-600 text-white px-4 py-2 rounded" : "bg-gray-600 text-white px-4 py-2 rounded";

  cargarUsuarios(currentPage, estado);
}

// ✅ Listar usuarios con paginación
async function cargarUsuarios(page = 1, estado = "ACTIVO") {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/registro/${estado.toLowerCase()}s?page=${page}&limit=${limit}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar usuarios");

    const { usuarios, totalPages } = await res.json();
    const tbody = document.getElementById("tablaUsuariosBody");
    tbody.innerHTML = "";

    usuarios.forEach((u, index) => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${(page - 1) * limit + index + 1}</td>
    <td>${u.nombre_completo}</td>
    <td>${u.ci}</td>
    <td>${u.rol}</td>
    <td>${u.correo}</td>
    <td>${u.telefono}</td>
    <td>${u.fecha_contratacion || "-"}</td>
    <td>${u.fecha_registro}</td>
    <td>${u.fecha_actualizacion}</td>
    <td>
      ${
        u.estado === "ACTIVO"
  ? `
    <button class="bg-blue-600 text-white px-2 py-1 rounded mr-2" 
            onclick="abrirModal(${u.id_personal}, '${u.nombres}', '${u.apellido1}', '${u.apellido2}', '${u.telefono}', '${u.estado}', ${u.id_rol})">
      Editar
    </button>
    <button class="bg-red-600 text-white px-2 py-1 rounded" onclick="eliminarUsuario(${u.id_personal})">
      Inactivar
    </button>
  `
  : `
    <button class="bg-green-600 text-white px-2 py-1 rounded" onclick="reactivarUsuario(${u.id_personal})">
      Reactivar
    </button>
  `
      }
    </td>
  `;
  tbody.appendChild(row);
});

    // renderizar paginación
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = `px-3 py-1 mx-1 rounded ${i === page ? "bg-teal-600 text-white" : "bg-gray-300"}`;
      btn.onclick = () => {
        currentPage = i;
        cargarUsuarios(i, currentEstado);
      };
      pagination.appendChild(btn);
    }

  } catch (err) {
    console.error("Error al cargar usuarios:", err);
  }
}

// ✅ Mostrar/ocultar formulario de registro
function toggleForm() {
  const formContainer = document.getElementById("formContainer");
  if (formContainer.classList.contains("hidden")) {
    formContainer.classList.remove("hidden");
    cargarRoles();
  } else {
    formContainer.classList.add("hidden");
  }
}

// ✅ Cargar roles en el select de registro
async function cargarRoles() {
  const token = localStorage.getItem("token");
  const select = document.getElementById("id_rol");
  if (!select) return;

  try {
    const res = await fetch(`${API_URL}/api/roles`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const roles = await res.json();
    select.innerHTML = '<option value="" disabled selected>Selecciona un rol...</option>';

    roles.forEach(rol => {
      const opt = document.createElement("option");
      opt.value = rol.id_rol;
      opt.textContent = `${rol.nombre} — ${rol.descripcion || ""}`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error al cargar roles:", err);
    select.innerHTML = '<option value="" disabled>Error al cargar roles</option>';
  }
}

// ✅ Registrar usuario
async function registrarUsuario(e) {
  e.preventDefault();

  const formData = {
    nombres: document.getElementById("nombres").value.trim(),
    apellido1: document.getElementById("apellido1").value.trim(),
    apellido2: document.getElementById("apellido2").value.trim(),
    ci: document.getElementById("ci").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    correo: document.getElementById("correo").value.trim().toLowerCase(),
    contrasena: document.getElementById("contrasena").value,
    id_rol: parseInt(document.getElementById("id_rol").value),
  };

  if (!formData.nombres || !formData.apellido1 || !formData.ci || !formData.correo || !formData.contrasena || !formData.id_rol) {
    mostrarMensaje("error", "Por favor completa todos los campos obligatorios");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/registro`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);

    mostrarMensaje("success", "Usuario registrado correctamente ✅");
    document.getElementById("registerForm").reset();
    cargarUsuarios(currentPage, currentEstado);

  } catch (err) {
    mostrarMensaje("error", err.message);
  }
}

// ✅ Eliminar usuario
async function eliminarUsuario(id) {
  const token = localStorage.getItem("token");
  if (confirm("¿Seguro que deseas inactivar a este usuario?")) {
    await fetch(`${API_URL}/api/registro/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    mostrarMensaje("success", "Usuario eliminado correctamente");
    cargarUsuarios(currentPage, currentEstado);
  }
}

// ✅ Reactivar usuario
async function reactivarUsuario(id) {
  const token = localStorage.getItem("token");
  if (confirm("¿Seguro que deseas activar a este usuario?")) {
    try {
      const res = await fetch(`${API_URL}/api/registro/reactivar/${id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al reactivar usuario");

      mostrarMensaje("success", "Usuario reactivado correctamente ✅");
      cargarUsuarios(currentPage, currentEstado);
    } catch (err) {
      mostrarMensaje("error", err.message);
    }
  }
}

// ✅ Modal de edición
async function abrirModal(id, nombres, apellido1, apellido2, telefono, estado, rolId) {
  document.getElementById("editId").value = id;
  document.getElementById("editNombres").value = nombres;
  document.getElementById("editApellido1").value = apellido1;
  document.getElementById("editApellido2").value = apellido2;
  document.getElementById("editTelefono").value = telefono;
  document.getElementById("editEstado").value = estado;
  await cargarRolesSelect(rolId);
  document.getElementById("editModal").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("editModal").classList.add("hidden");
}

// ✅ Cargar roles en modal de edición
async function cargarRolesSelect(selectedId = null) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/roles`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const roles = await res.json();
  const select = document.getElementById("editRol");
  select.innerHTML = roles.map(r => `
    <option value="${r.id_rol}" ${r.id_rol === selectedId ? "selected" : ""}>${r.nombre}</option>
  `).join("");
}

// ✅ Guardar cambios en modal
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const formData = {
    nombres: document.getElementById("editNombres").value.trim(),
    apellido1: document.getElementById("editApellido1").value.trim(),
    apellido2: document.getElementById("editApellido2").value.trim(),
    telefono: document.getElementById("editTelefono").value.trim(),
    estado: document.getElementById("editEstado").value,
    id_rol: parseInt(document.getElementById("editRol").value)
  };

  console.log("FormData enviado (edición):", formData);

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/registro/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Error al actualizar usuario");

    mostrarMensaje("success", "Usuario actualizado correctamente ✅");
    cerrarModal();
    cargarUsuarios(currentPage, currentEstado);
  } catch (err) {
    mostrarMensaje("error", err.message);
  }
});

// ✅ Abrir modal de edición
async function abrirModal(id, nombres, apellido1, apellido2, telefono, estado, rolId) {
  document.getElementById("editId").value = id;
  document.getElementById("editNombres").value = nombres;
  document.getElementById("editApellido1").value = apellido1;
  document.getElementById("editApellido2").value = apellido2;
  document.getElementById("editTelefono").value = telefono;
  document.getElementById("editEstado").value = estado;
  await cargarRolesSelect(rolId);
  document.getElementById("editModal").classList.remove("hidden");
}

// ✅ Cerrar modal
function cerrarModal() {
  document.getElementById("editModal").classList.add("hidden");
}