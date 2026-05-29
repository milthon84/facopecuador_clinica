"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback para navegadores sin Clipboard API
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={label ?? "Copiar"}
      className="shrink-0 p-1.5 rounded-lg hover:bg-lilac-50 transition-colors"
    >
      {copied
        ? <Check size={14} className="text-green-600" />
        : <Copy size={14} className="text-ink-400 hover:text-lilac-600" />
      }
    </button>
  );
}
