const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Extrae el token Bearer del header Authorization
const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) return null;
  return token;
};

// 1 - Requiere usuario autenticado
const requireAuth = (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "MISSING_OR_INVALID_TOKEN" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // Contrato fijo del backend
    req.user = {
      id: payload.id,
      rol: payload.rol,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

// 2 - Requiere rol específico
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.rol !== role) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    return next();
  };
};

// 3 - Admin o dueño del recurso (por param)
const adminOrOwner = (paramName = "id") => {
  return (req, res, next) => {
    if (req.user.rol === "admin") return next();

    const resourceOwnerId = Number(req.params[paramName]);
    if (resourceOwnerId !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    return next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
  adminOrOwner,
};
