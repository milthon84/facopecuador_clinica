import Link from "next/link";
import { CalendarDays, Clock, ShieldCheck, Facebook, Instagram } from "lucide-react";

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

export default function HomePage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Consultorio";

  return (
    <main className="min-h-screen bg-gradient-to-br from-lilac-50 via-white to-gold-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center">
          <img src="/logo.png" alt={clinicName} className="h-20 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-9 h-9 rounded-lg border border-ink-900/15 flex items-center justify-center text-ink-900/50 hover:text-ink-900 hover:border-ink-900/40 transition-all"
          >
            <Facebook size={16} />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-9 h-9 rounded-lg border border-ink-900/15 flex items-center justify-center text-ink-900/50 hover:text-ink-900 hover:border-ink-900/40 transition-all"
          >
            <Instagram size={16} />
          </a>
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="w-9 h-9 rounded-lg border border-ink-900/15 flex items-center justify-center text-ink-900/50 hover:text-ink-900 hover:border-ink-900/40 transition-all"
          >
            <TikTokIcon size={16} />
          </a>
        </div>
      </header>

      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-medium mb-6">
          <Clock size={14} /> Reserva en línea, 24/7
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-ink-900 mb-5 leading-tight">
          Agendá tu cita en menos de un minuto
        </h1>
        <p className="text-lg text-ink-600 mb-10">
          Reserva tu cita de forma rápida y sencilla.
        </p>
        <Link href="/reservar" className="btn-primary text-lg px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <CalendarDays size={22} />
          Reservar cita ahora
        </Link>
      </section>

      <section className="px-6 max-w-4xl mx-auto grid gap-4 md:grid-cols-3 pb-16">
        <FeatureCard
          icon={<CalendarDays className="text-gold-600" size={20} />}
          title="Disponibilidad real"
          text="Solo se muestran los horarios libres. Cero confusiones."
        />
        <FeatureCard
          icon={<ShieldCheck className="text-lilac-600" size={20} />}
          title="Datos protegidos"
          text="Tu información se guarda de forma segura y privada."
        />
        <FeatureCard
          icon={<Clock className="text-gold-600" size={20} />}
          title="Confirmación inmediata"
          text="Recibís el detalle por correo al instante."
        />
      </section>

      <footer className="border-t border-lilac-100 py-6 text-center text-xs text-ink-600/60">
        © {new Date().getFullYear()} {clinicName}
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-lg bg-lilac-50 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-ink-600">{text}</p>
    </div>
  );
}
