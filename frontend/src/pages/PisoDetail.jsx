import React, { useEffect, useState } from 'react';
import { getAllPisos } from '../api/piso';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/PisoDetail.css';
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";

const PisoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [piso, setPiso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllPisos(id)
      .then(data => {
        setPiso(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Cargando datos del piso...</p>
      </div>
    );
  }

  if (!piso) {
    return <p>No se encontró el piso.</p>;
  }

  return (
    <>
    <Navbar />
    <div className="piso-detail-container">
      <h2>{piso.nombre}</h2>
      <p><strong>Ciudad:</strong> {piso.ciudad}</p>
      <p className="precio"><strong>Precio:</strong> {piso.precio} €</p>
      <p className="descripcion"><strong>Descripción:</strong> {piso.descripcion}</p>

      <button 
        className="volver-btn" 
        onClick={() => navigate('/')}
      >
        ← Volver a la lista
      </button>
      <VolverInicio />
    </div>
    </>
  );
};

export default PisoDetail;
