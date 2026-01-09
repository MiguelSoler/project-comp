import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../styles/dashboard.css";
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <>
    <Navbar />
    <div className="dashboard-container">
      <h2 className="dashboard-title">Panel del Usuario</h2>
      {user ? (
        <>
          <p className="welcome-text">Bienvenido, <strong>{user.nombre}</strong> ✅</p>
          <p className="user-email">Email: {user.email}</p>
          <p className="user-phone">Teléfono: {user.telefono}</p>

          <div className="dashboard-buttons">
            <button onClick={() => navigate("/create-piso")}>📝 Crear Piso</button>
            <button onClick={() => navigate("/join-piso")}>🏠 Unirse a un Piso</button>
            <button onClick={handleLogout} className="logout-btn">🚪 Cerrar sesión</button>
          </div>
          <VolverInicio />
        </>
      ) : (
        <p>No hay usuario autenticado</p>
      )}
    </div>
    </>
  );
}
