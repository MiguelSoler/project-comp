import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";
import "../styles/Login.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const data = await login(email, password);
            if (data.token) {
            // Si el backend devuelve "Bearer eyJhbGciOi...", quitamos "Bearer "
                const jwt = data.token.startsWith("Bearer ") ? data.token.split(" ")[1] : data.token;
                loginUser(jwt);
                navigate("/dashboard");
} else {
    setError(data.error || "Error en el login");
}
        } catch (err) {
            setError("Error de conexión con el servidor");
        }
    };

    return (
        <>
        <Navbar />
        <div className="login-container">
            <h2>Iniciar sesión</h2>
            <form onSubmit={handleSubmit}>
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
                <button type="submit">Entrar</button>
            </form>
            {error && <p className="error">{error}</p>}
            <VolverInicio />
        </div>
        </>
    );
}
