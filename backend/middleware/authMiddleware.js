const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const getJwtSecret = () => process.env.JWT_SECRET;

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
    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: "INVALID_SERVER_CONFIG" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "MISSING_OR_INVALID_TOKEN" });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (_) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    if (!payload?.id) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    const result = await pool.query(
      `SELECT id, rol, activo
       FROM usuario
       WHERE id = $1
       LIMIT 1`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: "USER_INACTIVE" });
    }

    req.user = {
      id: user.id,
      rol: user.rol,
    };

    return next();
  } catch (error) {
    // Fallo del servidor
    console.error("requireAuth error:", error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
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
