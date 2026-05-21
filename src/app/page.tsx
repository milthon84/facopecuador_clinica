import Link from "next/link";
import { CalendarDays, Clock, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || "Consultorio";

  return (
    <main className="min-h-screen bg-gradient-to-br from-lilac-50 via-white to-gold-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center">
            <span className="text-gold-500 font-bold">A</span>
          </div>
          <span className="font-semibold text-ink-900">{clinicName}</span>
        </div>
        <Link href="/admin" className="text-sm text-lilac-700 hover:text-lilac-900">
          Acceso administrador
        </Link>
      </header>

      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-medium mb-6">
          <Clock size={14} /> Reserva en línea, 24/7
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-ink-900 mb-5 leading-tight">
          Agendá tu cita en menos de un minuto
        </h1>
        <p className="text-lg text-ink-600 mb-10">
          Elegí el día y horario que mejor te convenga. Sin llamadas, sin esperas.
        </p>
        <Link href="/reservar" className="btn-primary text-base px-7 py-4">
          <CalendarDays size={18} />
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
