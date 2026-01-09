const API_URL = '/api';

export const joinPiso = async (usuarioId, pisoId) => {
  try {
    const res = await fetch(`${API_URL}/usuario-piso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, piso_id: pisoId })
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error al unirse al piso:', error);
    return null;
  }
};

export const getUsuariosDePiso = async (pisoId) => {
  try {
    const res = await fetch(`${API_URL}/usuario-piso/${pisoId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error obteniendo usuarios del piso:', error);
    return [];
  }
};
