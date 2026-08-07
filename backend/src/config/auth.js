const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en producción (debe coincidir con el de maxan-auth/ERP)");
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "maxan-erp-secret-dev",
  JWT_EXPIRES_IN,
};
