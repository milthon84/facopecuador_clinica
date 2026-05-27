const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");

const dev = false; // siempre producción en Hostinger
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error al manejar solicitud:", err);
      res.statusCode = 500;
      res.end("Error interno del servidor");
    }
  });

  // Hostinger LiteSpeed usa un socket Unix — detectarlo automáticamente
  const port = process.env.PORT;

  if (port && isNaN(Number(port))) {
    // PORT es una ruta de socket Unix (ej. /usr/local/lsws/extapp-sock/...)
    const socketPath = port;

    // Eliminar socket anterior si existe para evitar errores EADDRINUSE
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    server.listen(socketPath, () => {
      // Dar permisos al socket para que LiteSpeed pueda acceder
      fs.chmodSync(socketPath, "777");
      console.log(`> Servidor listo en socket: ${socketPath}`);
    });
  } else {
    // Fallback: puerto TCP normal (desarrollo local)
    const tcpPort = parseInt(port || "3000", 10);
    server.listen(tcpPort, "0.0.0.0", () => {
      console.log(`> Servidor listo en http://0.0.0.0:${tcpPort}`);
    });
  }

  // Manejo limpio de señales de apagado
  process.on("SIGTERM", () => {
    server.close(() => {
      console.log("Servidor cerrado correctamente");
      process.exit(0);
    });
  });

}).catch((err) => {
  console.error("Error fatal al iniciar Next.js:", err);
  process.exit(1);
});
