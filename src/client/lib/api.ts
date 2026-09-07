// Wrapper de fetch que inyecta el token de sesion en todas las llamadas a la API.
// Firma identica a fetch para que el reemplazo `fetch(` -> `apiFetch(` sea mecanico.
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });

  // Solo forzamos logout si HABIA un token y el servidor lo rechazo (sesion
  // expirada/invalida). Un 401 sin token previo es simplemente un login
  // fallido (credenciales incorrectas) y no debe recargar la pagina.
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  return res;
}
