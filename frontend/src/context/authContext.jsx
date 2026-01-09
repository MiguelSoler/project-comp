import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                
                // Llamada al backend para obtener datos actualizados
                fetch(`/api/usuario/${decoded.id}`, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })
                .then(res => {
                    if (!res.ok) throw new Error("Token inválido o usuario no encontrado");
                    return res.json();
                })
                .then(data => setUser(data))
                .catch(err => {
                    console.error("Error obteniendo usuario:", err);
                    setUser(null);
                    setToken(null);
                    localStorage.removeItem("token");
                });

            } catch (error) {
                console.error("Error decodificando token:", error);
                setUser(null);
            }
        }
    }, [token]);

    const loginUser = (token) => {
        localStorage.setItem("token", token);
        setToken(token);
        console.log("Token recibido en loginUser:", token);
    };

    const logoutUser = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};
