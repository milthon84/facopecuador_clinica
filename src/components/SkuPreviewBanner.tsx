"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function SkuPreviewBanner({ sku }: { sku: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 bg-white border border-lilac-200 shadow-lg rounded-2xl px-5 py-3 min-w-[280px]">
        <Sparkles size={18} className="text-lilac-500 shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-lilac-700 uppercase tracking-wide">Código asignado automáticamente</p>
          <p className="text-sm text-ink-700 mt-0.5">
            Próximo código: <span className="font-bold text-lilac-700">{sku}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
