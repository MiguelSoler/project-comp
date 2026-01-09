import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import VolverInicio from "../components/VolverInicio";
import Navbar from "../components/Navbar";

export default function CreatePiso() {
    const [direccion, setDireccion] = useState("");
    const [ciudad, setCiudad] = useState("");
    const [codigoPostal, setCodigoPostal] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [error, setError] = useState(null);
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch("http://localhost:8080/api/piso", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    direccion,
                    ciudad,
                    codigo_postal: codigoPostal,
                    descripcion
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert("Piso creado correctamente ✅");
                navigate("/dashboard");
            } else {
                setError(data.error || "Error al crear piso");
            }
        } catch (err) {
            setError("Error de conexión con el servidor");
        }
    };

    return (
        <>
        <Navbar />
        <div className="create-piso-container">
            <h2>Crear Piso</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Dirección"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Ciudad"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Código Postal"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                />
                <textarea
                    placeholder="Descripción"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                />
                <button type="submit">Crear Piso</button>
            </form>
            {error && <p className="error">{error}</p>}
            <VolverInicio />
        </div>
        </>
    );
}
