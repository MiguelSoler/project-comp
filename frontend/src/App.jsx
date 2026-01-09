import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import ProtectedRoute from "./components/ProtectedRoute";

//Páginas
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreatePiso from "./pages/CreatePiso";
import JoinPiso from "./pages/JoinPiso";
import PisoList from "./pages/PisoList";
import PisoDetail from "./pages/PisoDetail";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-piso" element={<ProtectedRoute><CreatePiso /></ProtectedRoute>} />
          <Route path="/join-piso" element={<ProtectedRoute><JoinPiso /></ProtectedRoute>} />
          <Route path="/pisos" element={<ProtectedRoute><PisoList /></ProtectedRoute>} />
          <Route path="/pisos/:id" element={<ProtectedRoute><PisoDetail /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
