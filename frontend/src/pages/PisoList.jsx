import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllPisos } from '../api/piso'; // Nuevo método que llama a GET /api/pisos
import '../styles/PisoList.css';
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";

const PisoList = () => {
  const [ciudad, setCiudad] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [pisos, setPisos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const cargarPisos = () => {
    setLoading(true);
    getAllPisos({ ciudad, precioMax, page, limit: 10 })
      .then(data => {
        setPisos(data.pisos);
        setTotalPages(data.totalPages);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    cargarPisos();
  }, [ciudad, precioMax, page]);

  return (
    <>
      <Navbar />
      <div className="piso-list-container">
        <h2>Buscar pisos</h2>

        {/* Filtros */}
        <div className="filters">
          <input
            type="text"
            placeholder="Filtrar por ciudad..."
            value={ciudad}
            onChange={(e) => {
              setCiudad(e.target.value);
              setPage(1); // Reiniciar a página 1 al cambiar filtro
            }}
          />
          <input
            type="number"
            placeholder="Precio máximo (€)"
            value={precioMax}
            onChange={(e) => {
              setPrecioMax(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Lista de pisos */}
        {loading ? (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Cargando pisos...</p>
          </div>
        ) : pisos.length === 0 ? (
          <p className="no-results">No se encontraron pisos.</p>
        ) : (
          <ul className="piso-list">
            {pisos.map(piso => (
              <li key={piso.id} className="piso-card">
                <Link to={`/pisos/${piso.id}`}>
                  <div className="piso-info">
                    <h3>{piso.nombre}</h3>
                    <p>{piso.ciudad}</p>
                    <p className="piso-precio">{piso.precio} €</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Paginación */}
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={page === i + 1 ? 'active' : ''}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <VolverInicio />
      </div>
    </>
  );
};

export default PisoList;
