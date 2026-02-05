const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Extrae el token Bearer del header Authorization
const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) return null;
  return token;
};

// 1 - Requiere usuario autenticado + activo en BD
const requireAuth = async (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "MISSING_OR_INVALID_TOKEN" });
    }

    // 1) Verifica firma/expiración y extrae payload (id, rol, iat, exp...)
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload?.id) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    // 2) Verifica en BD que el usuario existe y está activo
    const result = await pool.query(
      `SELECT id, rol, activo
       FROM usuario
       WHERE id = $1
       LIMIT 1`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      // Token válido pero usuario ya no existe -> lo tratamos como no autorizado
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    // Contrato fijo del backend (rol desde BD para evitar tokens “stale”)
    req.user = {
      id: user.id,
      rol: user.rol,
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
