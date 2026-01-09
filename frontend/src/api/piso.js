const API_URL = '/api/pisos'; // El proxy de Vite redirige esto a http://localhost:8080

export const getAllPisos = async ({ ciudad = '', precioMax = '', page = 1, limit = 10 }) => {
  try {
    const params = new URLSearchParams();
    if (ciudad) params.append('ciudad', ciudad);
    if (precioMax) params.append('precioMax', precioMax);
    params.append('page', page);
    params.append('limit', limit);

    const response = await fetch(`${API_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo pisos:', error);
    return { pisos: [], total: 0, page: 1, totalPages: 1 };
  }
};
