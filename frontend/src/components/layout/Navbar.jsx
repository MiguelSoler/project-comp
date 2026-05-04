import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import roomRateLogo from "../../assets/branding/roomrate-logo.png";

const baseLink =
  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150";

const desktopNavLink = ({ isActive }) =>
  `${baseLink} ${
    isActive
      ? "bg-blue-100/80 text-brand-primary"
      : "text-ui-text hover:bg-white/70"
  }`;

const mobileNavLink = ({ isActive }) =>
  `block rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? "bg-blue-100 text-brand-primary"
      : "text-ui-text hover:bg-white/80"
  }`;

function MenuIcon({ open = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const panelPath =
    user?.rol === "admin"
      ? "/admin"
      : user?.rol === "advertiser"
        ? "/manager"
        : null;

  return (
    <header className="border-b border-blue-300 bg-gradient-to-r from-blue-300 via-sky-200 to-slate-100 shadow-md">
      <div className="app-container py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 transition-opacity duration-150 hover:opacity-90"
            >
              <img
                src={roomRateLogo}
                alt="RoomRate"
                className="h-10 w-auto shrink-0"
              />
          
              <span className="truncate font-heading text-xl font-bold tracking-tight text-ui-text">
                RoomRate
              </span>
            </Link>
          </div>

          <nav className="hidden xl:flex xl:items-center xl:gap-5 2xl:gap-8">
            <NavLink className={desktopNavLink} to="/habitaciones">
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
              <div className="flex min-w-0 items-center gap-1.5 2xl:gap-2">
                <NavLink className={desktopNavLink} to="/mi-estancia">
                  Mi estancia
                </NavLink>
                <NavLink className={desktopNavLink} to="/convivientes">
                  Convivientes
                </NavLink>
                <NavLink className={desktopNavLink} to="/mis-votos">
                  Mis votos
                </NavLink>
                <NavLink className={desktopNavLink} to="/mi-reputacion">
                  Mi reputación
                </NavLink>
                <NavLink className={desktopNavLink} to="/votos-recibidos">
                  Votos recibidos
                </NavLink>
                <NavLink className={desktopNavLink} to="/perfil">
                  Perfil
                </NavLink>

                {panelPath ? (
                  <Link className="btn btn-secondary btn-sm" to={panelPath}>
                    Panel
                  </Link>
                ) : null}

                <span className="max-w-[150px] truncate text-sm text-ui-text-secondary 2xl:max-w-none">
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

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-ui-text shadow-sm transition-colors hover:bg-white xl:hidden"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navbar-menu"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <MenuIcon open={isMobileMenuOpen} />
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div
            id="mobile-navbar-menu"
            className="mt-4 max-h-[calc(100dvh-88px)] overflow-y-auto rounded-2xl border border-white/70 bg-white/85 p-3 shadow-md backdrop-blur xl:hidden"
          >
            <div className="space-y-2">
              <NavLink
                className={mobileNavLink}
                to="/habitaciones"
                onClick={closeMobileMenu}
              >
                Habitaciones
              </NavLink>

              {!isAuthenticated ? (
                <>
                  <Link
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-ui-text transition-colors hover:bg-slate-50"
                    to="/login"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>

                  <Link
                    className="block rounded-xl bg-brand-primary px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    to="/register"
                    onClick={closeMobileMenu}
                  >
                    Registro
                  </Link>
                </>
              ) : (
                <>
                  <NavLink
                    className={mobileNavLink}
                    to="/mi-estancia"
                    onClick={closeMobileMenu}
                  >
                    Mi estancia
                  </NavLink>

                  <NavLink
                    className={mobileNavLink}
                    to="/convivientes"
                    onClick={closeMobileMenu}
                  >
                    Convivientes
                  </NavLink>

                  <NavLink
                    className={mobileNavLink}
                    to="/mis-votos"
                    onClick={closeMobileMenu}
                  >
                    Mis votos
                  </NavLink>

                  <NavLink
                    className={mobileNavLink}
                    to="/mi-reputacion"
                    onClick={closeMobileMenu}
                  >
                    Mi reputación
                  </NavLink>

                  <NavLink
                    className={mobileNavLink}
                    to="/votos-recibidos"
                    onClick={closeMobileMenu}
                  >
                    Votos recibidos
                  </NavLink>

                  <NavLink
                    className={mobileNavLink}
                    to="/perfil"
                    onClick={closeMobileMenu}
                  >
                    Perfil
                  </NavLink>

                  {panelPath ? (
                    <Link
                      className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-ui-text transition-colors hover:bg-slate-50"
                      to={panelPath}
                      onClick={closeMobileMenu}
                    >
                      Panel
                    </Link>
                  ) : null}

                  <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-ui-text-secondary">
                    Hola{user?.nombre ? `, ${user.nombre}` : ""}
                  </div>

                  <button
                    className="btn btn-danger w-full"
                    type="button"
                    onClick={handleLogout}
                  >
                    Salir
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}