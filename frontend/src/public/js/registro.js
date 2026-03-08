 const API_URL = "http://localhost:3000";

// Verificar token al cargar
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
  cargarUsuarios();

  // Enganchar formulario de registro
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", registrarUsuario);
  }
});

// Mostrar mensajes
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

//Listar Usuarios
async function cargarUsuarios(tipo = 'activos') {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/registro/${tipo}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const usuarios = await res.json();

    const tbody = document.getElementById("usuariosTable");
    tbody.innerHTML = usuarios.map(u => `
      <tr class="border-b border-white/20">
        <td class="py-2 px-4">${u.id_personal}</td>
        <td class="py-2 px-4">${u.nombres} ${u.apellido1}</td>
        <td class="py-2 px-4">${u.correo}</td>
        <td class="py-2 px-4">${u.rol}</td>
        <td class="py-2 px-4">${u.estado}</td>
        <td class="py-2 px-4 flex gap-2">
          ${u.estado === 'ACTIVO' 
            ? `<button onclick="abrirModal(${u.id_personal}, '${u.nombres}', '${u.apellido1}', '${u.apellido2}', '${u.telefono}', '${u.estado}', ${u.id_rol})" class="bg-blue-500 text-white px-3 py-1 rounded">Editar</button>
               <button onclick="eliminarUsuario(${u.id_personal})" class="bg-red-500 text-white px-3 py-1 rounded">Inactivar</button>`
            : `<button onclick="reactivarUsuario(${u.id_personal})" class="bg-green-500 text-white px-3 py-1 rounded">Reactivar</button>`
          }
        </td>
      </tr>
    `).join("");
  } catch (err) {
    mostrarMensaje("error", "Error al cargar usuarios");
  }
}

// Mostrar/ocultar formulario de registro
function toggleForm() {
  const formContainer = document.getElementById("formContainer");
  if (formContainer.classList.contains("hidden")) {
    formContainer.classList.remove("hidden");
    cargarRoles(); // ✅ cargar roles al abrir
  } else {
    formContainer.classList.add("hidden");
  }
}

// Cargar roles en el select de registro
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

// Registrar usuario (usa /api/registro)
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

  // ✅ Aquí también
  console.log("FormData enviado:", formData);

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
        "Authorization": `Bearer ${token}`   // ✅ enviar token
      },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Error ${res.status}: ${res.statusText}`);

    mostrarMensaje("success", "Usuario registrado correctamente ✅");
    document.getElementById("registerForm").reset();
    cargarUsuarios(); // refrescar tabla

  } catch (err) {
    mostrarMensaje("error", err.message);
  }
}

// Eliminar usuario
async function eliminarUsuario(id) {
  const token = localStorage.getItem("token");
  if (confirm("¿Seguro que deseas inactivar a este usuario?")) {
    await fetch(`${API_URL}/api/registro/${id}`, {   // ✅ corregido
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    mostrarMensaje("success", "Usuario eliminado correctamente");
    cargarUsuarios();
  }
}

//Reactivar Usuario
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
      cargarUsuarios('inactivos'); // refresca la pestaña actual
    } catch (err) {
      mostrarMensaje("error", err.message);
    }
  }
}

// Abrir modal de edición
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

// Cargar roles en modal de edición
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

// Guardar cambios en modal
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;
  const formData = {
    nombres: document.getElementById("editNombres").value,
    apellido1: document.getElementById("editApellido1").value,
    apellido2: document.getElementById("editApellido2").value,
    telefono: document.getElementById("editTelefono").value,
    estado: document.getElementById("editEstado").value,
    id_rol: parseInt(document.getElementById("editRol").value)
  };

    // ✅ Aquí colocas el console.log
  console.log("FormData enviado:", formData);

  const token = localStorage.getItem("token");
  await fetch(`${API_URL}/api/registro/${id}`, {
  method: "PUT",
  headers: { 
    "Content-Type": "application/json", 
    "Authorization": `Bearer ${token}` 
  },
  body: JSON.stringify(formData)
});

  mostrarMensaje("success", "Usuario actualizado correctamente");
  cerrarModal();
  cargarUsuarios();
});