import { useContext } from "react";
import { AuthContext } from "../context/authContext.jsx";

export default function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within <AuthProvider>");
    }
    return ctx;
}