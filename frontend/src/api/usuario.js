const API_URL = '/api'; // Proxy de Vite redirige a tu backend

export const getUsuarioById = async (id) => {
  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
};

export const getUsuarios = async () => {
  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
};
