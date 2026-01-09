import { useNavigate } from "react-router-dom";

export default function VolverInicio() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      style={{
        marginTop: "20px",
        padding: "8px 12px",
        backgroundColor: "#3498db",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "14px"
      }}
    >
      🏠 Volver al inicio
    </button>
  );
}
