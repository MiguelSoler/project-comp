import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { joinPiso } from "../api/usuarioPiso";
import { useNavigate } from "react-router-dom";
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";

export default function JoinPiso() {
    const [pisoId, setPisoId] = useState("");
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const data = await joinPiso(user.token, pisoId);
            if (data) {
                alert("Te has unido al piso correctamente ✅");
                navigate("/dashboard");
            } else {
                setError("Error al unirse al piso");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        }
    };

    return (
        <>
            <Navbar />
            <div>
                <h2>Unirse a un Piso</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="ID del Piso"
                        value={pisoId}
                        onChange={(e) => setPisoId(e.target.value)}
                        required
                    />
                    <button type="submit">Unirse</button>
                </form>
                {error && <p className="error">{error}</p>}
                <VolverInicio />
            </div>
        </>
    );
}
