import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";

const baseLink =
  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150";

const navLink = ({ isActive }) =>
  `${baseLink} ${
    isActive
      ? "bg-blue-100/80 text-brand-primary"
      : "text-ui-text hover:bg-white/70"
  }`;

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Panel según rol (solo admin/manager-anunciante)
  const panelPath =
    user?.rol === "admin"
      ? "/admin"
      : user?.rol === "advertiser"
      ? "/manager"
      : null;

  return (
    <header className="border-b border-blue-300 bg-gradient-to-r from-blue-300 via-sky-200 to-slate-100 shadow-md">
      <div className="app-container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-base font-semibold text-ui-text transition-colors duration-150 hover:text-brand-primary"
          >
            Project Comp
          </Link>
        </div>

        <nav className="flex items-center gap-6 md:gap-8">
          <NavLink className={navLink} to="/habitaciones">
            Habitaciones
          </NavLink>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link className="btn btn-secondary btn-sm" to="/login">
                Login
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Registro
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink className={navLink} to="/mi-estancia">
                Mi estancia
              </NavLink>
              <NavLink className={navLink} to="/convivientes">
                Convivientes
              </NavLink>
              <NavLink className={navLink} to="/perfil">
                Perfil
              </NavLink>

              {panelPath ? (
                <Link className="btn btn-secondary btn-sm" to={panelPath}>
                  Panel
                </Link>
              ) : null}

              <span className="text-sm text-ui-text-secondary">
                Hola{user?.nombre ? `, ${user.nombre}` : ""}
              </span>

              <button
                className="btn btn-danger btn-sm"
                type="button"
                onClick={handleLogout}
              >
                Salir
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}