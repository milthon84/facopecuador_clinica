const dns = require("dns");
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silencia advertencias de paquetes SWC opcionales para otras plataformas
  webpack: (config) => {
    config.infrastructureLogging = { level: "error" };
    return config;
  },
};

module.exports = nextConfig;

