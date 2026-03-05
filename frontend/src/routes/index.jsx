import { Navigate, Route, Routes } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.jsx";

import Home from "../pages/public/Home.jsx";
import HabitacionesList from "../pages/public/HabitacionesList.jsx";
import HabitacionDetail from "../pages/public/HabitacionDetail.jsx";

import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";

import DashboardManager from "../pages/manager/DashboardManager.jsx";
import DashboardAdmin from "../pages/admin/DashboardAdmin.jsx";

import NotFound from "../pages/NotFound.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Entrada principal: mostrar contenido directamente */}
        <Route index element={<HabitacionesList />} />

        {/* Auth */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Público: producto = habitaciones */}
        <Route path="habitaciones" element={<HabitacionesList />} />
        <Route path="habitaciones/:habitacionId" element={<HabitacionDetail />} />

        {/* Privado (placeholder) */}
        <Route path="manager" element={<DashboardManager />} />
        <Route path="admin" element={<DashboardAdmin />} />

        {/* Landing opcional (si quieres conservarla) */}
        <Route path="home" element={<Home />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}