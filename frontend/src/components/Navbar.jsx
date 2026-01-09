import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";

export default function Navbar() {
  const { token, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <nav style={{
      padding: '10px',
      backgroundColor: '#3498db',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      {/* Botón Volver al inicio */}
      <button
        onClick={() => navigate("/")}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        🏠 Inicio
      </button>

      {/* Enlaces de navegación */}
      <div>
        {token ? (
          <>
            <Link to="/dashboard" style={{ marginRight: '15px', color: 'white' }}>Panel</Link>
            <Link to="/create-piso" style={{ marginRight: '15px', color: 'white' }}>Crear Piso</Link>
            <Link to="/join-piso" style={{ marginRight: '15px', color: 'white' }}>Unirse a Piso</Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🚪 Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: '15px', color: 'white' }}>Login</Link>
            <Link to="/register" style={{ color: 'white' }}>Registro</Link>
          </>
        )}
      </div>
    </nav>
  );
}
