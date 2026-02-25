// registro.js


const API_URL = 'http://localhost:3000';  

document.addEventListener('DOMContentLoaded', async () => {
    await cargarRoles();
    document.getElementById('registerForm').addEventListener('submit', registrarUsuario);
});

async function cargarRoles() {
    const select = document.getElementById('id_rol');
    if (!select) {
        console.error("No se encontró el elemento #id_rol");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/roles`);

        if (!res.ok) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const roles = await res.json();

        select.innerHTML = '<option value="" disabled selected>Selecciona un rol...</option>';

        roles.forEach(rol => {
            const opt = document.createElement('option');
            opt.value = rol.id_rol;
            opt.textContent = `${rol.nombre} — ${rol.descripcion || ''}`;
            select.appendChild(opt);
        });

    } catch (err) {
        console.error('Error al cargar roles:', err);
        select.innerHTML = '<option value="" disabled>Error al cargar roles</option>';
    }
}

async function registrarUsuario(e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const loading = document.getElementById('loading');

    if (!btn || !btnText || !loading) {
        console.error("Faltan elementos del botón de submit");
        return;
    }

    btn.disabled = true;
    btnText.textContent = 'Registrando...';
    loading.classList.remove('hidden');

    const formData = {
        nombres: document.getElementById('nombres')?.value.trim() || '',
        apellido1: document.getElementById('apellido1')?.value.trim() || '',
        apellido2: document.getElementById('apellido2')?.value.trim() || null,
        ci: document.getElementById('ci')?.value.trim() || '',
        telefono: document.getElementById('telefono')?.value.trim() || null,
        correo: document.getElementById('correo')?.value.trim().toLowerCase() || '',
        contrasena: document.getElementById('contrasena')?.value || '',
        id_rol: parseInt(document.getElementById('id_rol')?.value) || null
    };

    // Validación básica en frontend (opcional pero útil)
    if (!formData.nombres || !formData.apellido1 || !formData.ci || !formData.correo || !formData.contrasena || !formData.id_rol) {
        mostrarMensaje('error', 'Por favor completa todos los campos obligatorios');
        resetButton();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        let data;
        try {
            data = await res.json();
        } catch {
            throw new Error('Respuesta del servidor no es JSON válida');
        }

        if (res.ok) {
            mostrarMensaje('success', '¡Usuario registrado exitosamente! Redirigiendo al login...');
            setTimeout(() => {
                window.location.href = './login.html';   // o la ruta real de tu login
            }, 2200);
        } else {
            mostrarMensaje('error', data.message || `Error ${res.status}: ${res.statusText}`);
        }

    } catch (err) {
        console.error('Error en el registro:', err);
        mostrarMensaje('error', 'No se pudo conectar con el servidor. ¿Está el backend corriendo?');
    } finally {
        resetButton();
    }
}

function resetButton() {
    const btn = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const loading = document.getElementById('loading');

    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Registrar';
    if (loading) loading.classList.add('hidden');
}

function mostrarMensaje(tipo, texto) {
    const errorDiv = document.getElementById('errorMsg');
    const successDiv = document.getElementById('successMsg');

    if (!errorDiv || !successDiv) return;

    if (tipo === 'error') {
        errorDiv.textContent = texto;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    } else {
        successDiv.textContent = texto;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    }
}