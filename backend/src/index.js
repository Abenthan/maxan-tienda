require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const catalogoRouter = require("./routes/catalogo");
const pedidosRouter = require("./routes/pedidos");

const app = express();
app.set("trust proxy", true);
app.locals.pool = pool;
const PORT = process.env.PORT || 3007;

app.use(
  cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : true,
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/catalogo", catalogoRouter);
app.use("/api/pedidos", pedidosRouter);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Error de conexión a la base de datos:", error.message);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  const message =
    process.env.NODE_ENV === "production"
      ? "Error interno del servidor"
      : err.message || "Error interno del servidor";
  res.status(err.status || 500).json({ error: message });
});

const server = app.listen(PORT, () => {
  console.log(`maxan-tienda backend escuchando en el puerto ${PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    pool.end().then(() => {
      console.log("Pool de BD cerrado. Servidor detenido.");
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error("Forzando cierre después de timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
