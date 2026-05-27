const dns = require("dns");
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Modo standalone: empaqueta todo lo necesario para correr en servidores como Hostinger
  output: "standalone",
  // Silencia advertencias de paquetes SWC opcionales para otras plataformas
  webpack: (config) => {
    config.infrastructureLogging = { level: "error" };
    return config;
  },
};

module.exports = nextConfig;

