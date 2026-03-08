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

// Mostrar/ocultar formulario
function toggleForm() {
  document.getElementById("formContainer").classList.toggle("hidden");
}

// Cargar roles
async function cargarRoles() {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${API_URL}/api/roles`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Error al cargar roles");
    const roles = await res.json();

    const tbody = document.getElementById("rolesTable");
    tbody.innerHTML = roles.map(r => `
      <tr class="border-b border-white/20">
        <td class="py-2 px-4">${r.id_rol}</td>
        <td class="py-2 px-4">${r.nombre}</td>
        <td class="py-2 px-4">${r.descripcion || ""}</td>
        <td class="py-2 px-4">${new Date(r.fecha_registro).toLocaleString()}</td>
        <td class="py-2 px-4 flex gap-2">
          <button onclick="abrirModal(${r.id_rol}, '${r.nombre}', '${r.descripcion || ""}')" class="bg-blue-500 text-white px-3 py-1 rounded">Editar</button>
          <button onclick="eliminarRol(${r.id_rol})" class="bg-red-500 text-white px-3 py-1 rounded">Eliminar</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error al cargar roles:", err);
  }
}

// Crear rol
document.getElementById("createForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const formData = {
    nombre: document.getElementById("nombre").value.trim(),
    descripcion: document.getElementById("descripcion").value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/api/roles`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error("Error al crear rol");
    cargarRoles();
    e.target.reset();
    toggleForm();
  } catch (err) {
    console.error(err);
  }
});

// Abrir modal
function abrirModal(id, nombre, descripcion) {
  document.getElementById("editId").value = id;
  document.getElementById("editNombre").value = nombre;
  document.getElementById("editDescripcion").value = descripcion;
  document.getElementById("editModal").classList.remove("hidden");
}

// Cerrar modal
function cerrarModal() {
  document.getElementById("editModal").classList.add("hidden");
}

// Guardar cambios
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  const id = document.getElementById("editId").value;
  const formData = {
    nombre: document.getElementById("editNombre").value.trim(),
    descripcion: document.getElementById("editDescripcion").value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/api/roles/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (!res.ok) throw new Error("Error al actualizar rol");
    cargarRoles();
    cerrarModal();
  } catch (err) {
    console.error(err);
  }
});

// Eliminar rol
async function eliminarRol(id) {
  const token = localStorage.getItem("token");
  if (confirm("¿Seguro que deseas eliminar este rol?")) {
    try {
      const res = await fetch(`${API_URL}/api/roles/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al eliminar rol");
      cargarRoles();
    } catch (err) {
      console.error(err);
    }
  }
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  cargarRoles();
});