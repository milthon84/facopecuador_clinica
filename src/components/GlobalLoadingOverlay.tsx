"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function GlobalLoadingOverlay() {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const options = args[1];
      const method = options?.method?.toUpperCase() || "GET";
      const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

      if (isWrite) {
        setActiveRequests((prev) => prev + 1);
      }

      try {
        const response = await originalFetch.apply(window, args);
        return response;
      } finally {
        if (isWrite) {
          setActiveRequests((prev) => Math.max(0, prev - 1));
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (activeRequests === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div className="bg-white border border-lilac-100 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-lilac-50 flex items-center justify-center text-lilac-600 mb-4 animate-pulse">
          <Loader2 className="animate-spin text-lilac-600" size={32} />
        </div>
        <h3 className="text-base font-bold text-center text-ink-900 mb-1">
          Procesando solicitud
        </h3>
        <p className="text-xs text-ink-600 text-center leading-relaxed">
          Por favor, espere un momento mientras se guardan los cambios en el sistema.
        </p>
      </div>
    </div>
  );
}
