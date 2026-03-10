import { Route, Routes } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.jsx";

import Home from "../pages/public/Home.jsx";
import HabitacionesList from "../pages/public/HabitacionesList.jsx";
import HabitacionDetail from "../pages/public/HabitacionDetail.jsx";

import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";

import Perfil from "../pages/usuario/Perfil.jsx";
import MiEstancia from "../pages/usuario/MiEstancia.jsx";
import Convivientes from "../pages/usuario/Convivientes.jsx";
import VotarConviviente from "../pages/usuario/VotarConviviente.jsx";
import MisVotos from "../pages/usuario/MisVotos.jsx";
import MiReputacion from "../pages/usuario/MiReputacion.jsx";
import VotosRecibidos from "../pages/usuario/VotosRecibidos.jsx";

import DashboardManager from "../pages/manager/DashboardManager.jsx";
import PisoManagerDetail from "../pages/manager/PisoManagerDetail.jsx";
import DashboardAdmin from "../pages/admin/DashboardAdmin.jsx";

import NotFound from "../pages/NotFound.jsx";

import AuthGuard from "../middleware/authGuard.jsx";
import RoleGuard from "../middleware/roleGuard.jsx";

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

        {/* Privado */}
        <Route element={<AuthGuard />}>
          <Route path="perfil" element={<Perfil />} />
          <Route path="mi-estancia" element={<MiEstancia />} />
          <Route path="convivientes" element={<Convivientes />} />
          <Route path="convivientes/:usuarioId/votar" element={<VotarConviviente />} />
          <Route path="mis-votos" element={<MisVotos />} />
          <Route path="mi-reputacion" element={<MiReputacion />} />
          <Route path="votos-recibidos" element={<VotosRecibidos />} />
          <Route element={<RoleGuard allowedRoles={["advertiser"]} />}>
            <Route path="manager" element={<DashboardManager />} />
            <Route path="manager/piso/:pisoId" element={<PisoManagerDetail />} />
          </Route>

          <Route element={<RoleGuard allowedRoles={["admin"]} />}>
            <Route path="admin" element={<DashboardAdmin />} />
          </Route>
        </Route>

        {/* Landing opcional (si quieres conservarla) */}
        <Route path="home" element={<Home />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}