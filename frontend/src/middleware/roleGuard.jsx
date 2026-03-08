import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

export default function RoleGuard({ allowedRoles = [] }) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const userRole = user?.rol;

    if (!allowedRoles.includes(userRole)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}