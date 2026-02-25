document.addEventListener('DOMContentLoaded', () => {

  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const rol = user.rol_nombre;

  document.getElementById('nombreUsuario').textContent = user.nombres;
  document.getElementById('rolUsuario').textContent = rol;

  // Ocultar secciones según rol
  document.querySelectorAll('[data-role]').forEach(section => {
    const rolesPermitidos = section.dataset.role.split(',');

    if (!rolesPermitidos.includes(rol)) {
      section.style.display = 'none';
    }
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });

});