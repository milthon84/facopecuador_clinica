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
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  async headers() {
    return [
      {
        // Evita el caché en Hostinger y proxies para los archivos HTML y rutas
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        // Mantiene el caché a largo plazo para los assets estáticos de Next.js
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

