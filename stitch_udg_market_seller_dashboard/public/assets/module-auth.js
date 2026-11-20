fetch('/api/auth/me', { credentials: 'same-origin' })
  .then((response) => {
    if (response.status === 401) {
      window.top.location.assign('/app/login.html');
      return;
    }
    if (!response.ok) throw new Error('No se pudo validar la sesión.');
  })
  .catch((error) => console.error(error));
