import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import "../styles/Home.css";

export default function Home() {
  return (
    <div className="home-container">
      <Navbar />
      <main className="home-main">
        <h1 className="home-title">🏠 Bienvenido a Habitaciones Compartidas</h1>
        <p className="home-subtitle">Encuentra y comparte pisos fácilmente.</p>
        <Link to="/pisos" className="home-button">Ver lista de pisos</Link>
      </main>
      <Footer />
    </div>
  );
}
