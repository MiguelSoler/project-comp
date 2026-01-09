import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { register } from "../api/auth";
import { useNavigate } from "react-router-dom";
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";
import "../styles/Register.css";

export default function Register() {
    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [telefono, setTelefono] = useState("");
    const [limpieza, setLimpieza] = useState(3);
    const [ruido, setRuido] = useState(3);
    const [puntualidadPagos, setPuntualidadPagos] = useState(3);
    const [error, setError] = useState(null);
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const data = await register({
                nombre,
                email,
                password,
                telefono,
                limpieza,
                ruido,
                puntualidad_pagos: puntualidadPagos
            });

            if (data.token) {
                loginUser(data.token);
                navigate("/dashboard");
            } else {
                setError(data.error || "Error en el registro");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        }
    };

    return (
        <>
        <Navbar />
        <div className="register-container">
            <h2>Registro</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                />
                <label>Limpieza: {limpieza}</label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={limpieza}
                    onChange={(e) => setLimpieza(e.target.value)}
                />
                <label>Ruido: {ruido}</label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={ruido}
                    onChange={(e) => setRuido(e.target.value)}
                />
                <label>Puntualidad Pagos: {puntualidadPagos}</label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={puntualidadPagos}
                    onChange={(e) => setPuntualidadPagos(e.target.value)}
                />
                <button type="submit">Registrarse</button>
            </form>
            {error && <p className="error">{error}</p>}
            <VolverInicio />
        </div>
        </>
    );
}
