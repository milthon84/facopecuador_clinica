// server.js — punto de entrada para Hostinger
// Next.js en modo "standalone" genera su propio servidor en .next/standalone/server.js
// Este archivo lo lanza y le pasa el puerto/socket correcto de Hostinger.

const path = require("path");
const fs = require("fs");

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (!fs.existsSync(standaloneServer)) {
  console.error("ERROR: No se encontró .next/standalone/server.js");
  console.error("Asegúrate de haber ejecutado 'npm run build' con output: 'standalone' en next.config.js");
  process.exit(1);
}

// Pasar el puerto/socket de Hostinger al servidor standalone
const port = process.env.PORT || "3000";
process.env.PORT = port;
process.env.HOSTNAME = "0.0.0.0";

// Iniciar el servidor standalone de Next.js
require(standaloneServer);
