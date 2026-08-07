const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/auth");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function authorizeRol(...roles) {
  return (req, res, next) => {
    const rol = req.user?.roles || [];
    if (!roles.some((r) => rol.includes(r))) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };
}

module.exports = { authenticate, authorizeRol };
