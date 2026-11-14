/* ==========================================================
   UDG Market · Protección de páginas (simulada)
   Soporta sessionStorage, localStorage y respaldo en window.name
   para funcionar tanto en servidor local como en protocolo file://
   ========================================================== */
(function () {
  const KEY = 'udg-market-session';

  function getSession() {
    try {
      const fromSession = sessionStorage.getItem(KEY);
      if (fromSession) return JSON.parse(fromSession);
    } catch (e) {}

    try {
      const fromLocal = localStorage.getItem(KEY);
      if (fromLocal) return JSON.parse(fromLocal);
    } catch (e) {}

    try {
      if (typeof window.name === 'string' && window.name.indexOf('udg-auth:') === 0) {
        const email = window.name.replace('udg-auth:', '') || 'prueba@alumnos.udg.mx';
        const fallbackSession = { email: email, isAuthenticated: true, loggedAt: Date.now() };
        try { sessionStorage.setItem(KEY, JSON.stringify(fallbackSession)); } catch (e) {}
        try { localStorage.setItem(KEY, JSON.stringify(fallbackSession)); } catch (e) {}
        return fallbackSession;
      }
    } catch (e) {}

    return null;
  }

  const isInPagesDir = () => /\/pages\/[^/]*$/i.test(location.pathname.replace(/\\/g, '/'));
  const getLoginPath = () => (isInPagesDir() ? 'login.html' : 'pages/login.html');

  window.udgAuth = {
    session: getSession,
    logout: function () {
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      try { localStorage.removeItem(KEY); } catch (e) {}
      try { if (typeof window.name === 'string' && window.name.indexOf('udg-auth:') === 0) window.name = ''; } catch (e) {}
      window.location.href = getLoginPath();
    }
  };

  if (!getSession()) {
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page !== 'login.html') {
      const target = isInPagesDir() ? page : '../' + page;
      const next = target + location.search + location.hash;
      location.replace(getLoginPath() + '?next=' + encodeURIComponent(next));
    }
  }
})();
