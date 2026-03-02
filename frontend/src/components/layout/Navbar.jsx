import { Link, NavLink } from "react-router-dom";

const baseLink = "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150";
const navLink = ({ isActive }) =>
    `${baseLink} ${isActive ? "bg-blue-50 text-brand-primary" : "text-ui-text hover:bg-slate-50"
    }`;

export default function Navbar() {
    return (
        <header className="border-b border-ui-border bg-ui-surface">
            <div className="app-container flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                    <Link to="/" className="text-base font-semibold text-ui-text">
                        Project Comp
                    </Link>
                    <span className="text-ui-muted text-sm">MVP</span>
                </div>

                <nav className="flex items-center gap-2">
                    <NavLink className={navLink} to="/habitaciones">
                        Habitaciones
                    </NavLink>

                    <div className="hidden sm:flex items-center gap-2">
                        <Link className="btn btn-secondary btn-sm" to="/login">
                            Login
                        </Link>
                        <Link className="btn btn-primary btn-sm" to="/register">
                            Registro
                        </Link>
                    </div>

                    {/* Mobile quick actions */}
                    <div className="flex sm:hidden items-center gap-2">
                        <Link className="btn btn-secondary btn-sm" to="/login">
                            Login
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}