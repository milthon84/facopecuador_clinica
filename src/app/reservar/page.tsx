"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDateLocal, formatTimeLocal } from "@/lib/availability";
import type { TimeSlot } from "@/lib/types";

type Step = "date" | "slot" | "data" | "submitting";

export default function ReservarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("date");
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Datos del paciente
  const [document, setDocument] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [lookupDone, setLookupDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Buscar slots al seleccionar fecha
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    fetch(`/api/availability?date=${formatDateLocal(selectedDate)}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // Lookup de paciente al escribir cédula o email
  async function lookupPatient(by: "document" | "email", value: string) {
    if (!value || value.length < 3) return;
    try {
      const r = await fetch(`/api/patients/lookup?${by}=${encodeURIComponent(value)}`);
      const data = await r.json();
      if (data.patient) {
        setFullName(data.patient.full_name);
        setPhone(data.patient.phone);
        if (by === "document") setEmail(data.patient.email);
        if (by === "email") setDocument(data.patient.document_number || "");
        setLookupDone(true);
      }
    } catch {
      // silencioso
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!document.trim()) e.document = "Ingresá tu cédula";
    if (!fullName.trim() || fullName.trim().length < 3) e.fullName = "Nombre completo requerido";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) e.phone = "Teléfono inválido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!selectedSlot) return;
    if (!validate()) return;

    setStep("submitting");
    setSubmitError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: { document_number: document.trim(), full_name: fullName.trim(), phone: phone.trim(), email: email.trim().toLowerCase() },
          starts_at: selectedSlot.start,
          ends_at: selectedSlot.end,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la cita");
      router.push(`/reservar/confirmacion/${data.appointment_id}`);
    } catch (err: any) {
      setSubmitError(err.message || "Error al crear la cita");
      setStep("data");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-lilac-50 via-white to-gold-50">
      <header className="px-6 py-5 max-w-3xl mx-auto flex items-center gap-3">
        <Link href="/" className="text-ink-600 hover:text-ink-900">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-semibold">Reservar cita</h1>
      </header>

      <div className="px-4 sm:px-6 max-w-3xl mx-auto pb-12">
        <Stepper step={step} />

        {step === "date" && (
          <div className="card p-5 sm:p-6 mt-6">
            <h2 className="text-lg font-semibold mb-1">1. Elegí el día</h2>
            <p className="text-sm text-ink-600 mb-4">Solo se muestran los días con horarios disponibles.</p>
            <MonthCalendar
              cursor={monthCursor}
              setCursor={setMonthCursor}
              selectedDate={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
                setStep("slot");
              }}
            />
          </div>
        )}

        {step === "slot" && selectedDate && (
          <div className="card p-5 sm:p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">2. Elegí el horario</h2>
              <button onClick={() => setStep("date")} className="text-sm text-lilac-700 hover:underline">
                Cambiar día
              </button>
            </div>
            <div className="mb-4 px-3 py-2 rounded-lg bg-gold-50 text-gold-800 text-sm inline-flex items-center gap-2">
              <Calendar size={14} />
              {selectedDate.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            </div>

            {loadingSlots ? (
              <div className="text-sm text-ink-600">Cargando horarios disponibles…</div>
            ) : slots.length === 0 ? (
              <div className="text-sm text-ink-600">No hay horarios disponibles este día.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => {
                  const label = formatTimeLocal(s.start);
                  const isSelected = selectedSlot?.start === s.start;
                  return (
                    <button
                      key={s.start}
                      disabled={!s.available}
                      onClick={() => setSelectedSlot(s)}
                      className={`py-3 rounded-xl border text-sm font-medium transition ${
                        !s.available
                          ? "bg-ink-100 text-ink-600/50 cursor-not-allowed border-ink-100"
                          : isSelected
                          ? "bg-ink-900 text-gold-500 border-ink-900"
                          : "bg-white border-lilac-200 hover:border-gold-500 text-ink-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep("data")} disabled={!selectedSlot} className="btn-primary">
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {(step === "data" || step === "submitting") && selectedSlot && (
          <div className="card p-5 sm:p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">3. Tus datos</h2>
              <button onClick={() => setStep("slot")} className="text-sm text-lilac-700 hover:underline">
                Cambiar horario
              </button>
            </div>

            <div className="mb-5 p-3 rounded-xl bg-gold-50 text-sm text-gold-800 flex items-center gap-2">
              <Calendar size={14} />
              {(() => {
                const dt = new Date(selectedSlot.start);
                const datePart = dt.toLocaleDateString("es-CO", {
                  weekday: "long", day: "numeric", month: "long"
                });
                return `${datePart} a las ${formatTimeLocal(dt)}`;
              })()}
            </div>

            <div className="grid gap-4">
              <Field label="Cédula / Documento *" error={errors.document}>
                <input
                  className="input"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  onBlur={(e) => lookupPatient("document", e.target.value)}
                  placeholder="Ej: 1020304050"
                />
              </Field>

              <Field label="Nombre completo *" error={errors.fullName}>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre y apellido" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Teléfono *" error={errors.phone}>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
                </Field>
                <Field label="Email *" error={errors.email}>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => lookupPatient("email", e.target.value)}
                    placeholder="tu@email.com"
                  />
                </Field>
              </div>

              <Field label="Motivo de consulta (opcional)">
                <textarea
                  className="input min-h-[80px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brevemente, ¿qué te trae a la cita?"
                />
              </Field>

              {lookupDone && (
                <div className="text-xs text-lilac-700 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Reconocimos tus datos de visitas anteriores.
                </div>
              )}

              {submitError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {submitError}
                </div>
              )}

              <div className="flex justify-between gap-3 mt-2">
                <button onClick={() => setStep("slot")} className="btn-ghost">
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button onClick={submit} disabled={step === "submitting"} className="btn-primary">
                  {step === "submitting" ? "Reservando…" : "Confirmar cita"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = ["date", "slot", "data"];
  const currentIdx = steps.indexOf(step === "submitting" ? "data" : step);
  return (
    <div className="flex gap-2 mt-4">
      {steps.map((s, i) => (
        <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? "bg-gold-500" : "bg-lilac-100"}`} />
      ))}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <div className="text-xs text-red-700 mt-1">{error}</div>}
    </div>
  );
}

function MonthCalendar({
  cursor, setCursor, selectedDate, onSelect,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(addMonths(cursor, -1))} className="btn-ghost px-3 py-2">
          <ChevronLeft size={16} />
        </button>
        <div className="font-medium capitalize">{monthLabel}</div>
        <button onClick={() => setCursor(addMonths(cursor, 1))} className="btn-ghost px-3 py-2">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-600 mb-2">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const isPast = d < today;
          const isSelected = selectedDate?.toDateString() === d.toDateString();
          const dow = d.getDay();
          // Lun-Sáb: 1..6 disponibles, Dom (0) cerrado
          const isClosed = dow === 0;
          const disabled = isPast || isClosed;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(d)}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                disabled
                  ? "bg-transparent text-ink-600/30 cursor-not-allowed"
                  : isSelected
                  ? "bg-ink-900 text-gold-500"
                  : "bg-white border border-lilac-100 hover:border-gold-500 hover:bg-gold-50"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function buildMonthGrid(cursor: Date): (Date | null)[] {
  const first = startOfMonth(cursor);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
