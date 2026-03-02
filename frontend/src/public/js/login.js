// login.js

const API_URL = 'http://localhost:3000';   // ← cambia a tu puerto real si es diferente

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();

    const btn = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');

    btn.disabled = true;
    btnText.textContent = 'Iniciando...';
    spinner.classList.remove('hidden');

    const correo = document.getElementById('correo').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ correo, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Guardamos el token (puedes usar localStorage o sessionStorage)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            mostrarMensaje('success', '¡Bienvenid@! Redirigiendo...');

            // redirigir según rol
            setTimeout(() => {
                switch (data.user.rol_nombre) {
                    case 'SUPERVISOR':
                        window.location.href = './dashboardSupervisor.html';
                        break;
                    case 'ADMINISTRADOR':
                    case 'TECNICO':
                    case 'OPERADOR':
                    default:
                        window.location.href = './dashboard_principal.html';
                        break;
                }
            }, 1500);
        } else {
            mostrarMensaje('error', data.message || 'Credenciales inválidas');
        }
    } catch (err) {
        console.error('Error en login:', err);
        mostrarMensaje('error', 'No se pudo conectar con el servidor');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        spinner.classList.add('hidden');
    }
}

function mostrarMensaje(tipo, texto) {
    const errorDiv = document.getElementById('errorMsg');
    const successDiv = document.getElementById('successMsg');

    if (tipo === 'error') {
        errorDiv.textContent = texto;
        errorDiv.classList.remove('hidden');
        successDiv?.classList.add('hidden');
    } else {
        successDiv.textContent = texto;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    }
}