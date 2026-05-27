import type {
  AvailabilityRule,
  AvailabilityException,
  Appointment,
  TimeSlot,
} from "./types";

/**
 * Genera los slots disponibles para una fecha específica.
 * Aplica las reglas base + suma horarios extra + resta bloqueos y citas existentes.
 */
export function computeSlotsForDate(
  date: Date,
  rules: AvailabilityRule[],
  exceptions: AvailabilityException[],
  bookedAppointments: Pick<Appointment, "starts_at" | "ends_at" | "status">[]
): TimeSlot[] {
  const dow = date.getDay();
  const dateStr = formatDateLocal(date);

  // 1) Reglas activas del día
  const dayRules = rules.filter((r) => r.day_of_week === dow && r.is_active);

  // 2) Excepciones del día
  const dayExceptions = exceptions.filter((e) => e.date === dateStr);
  const blocks = dayExceptions.filter((e) => e.type === "block");
  const extras = dayExceptions.filter((e) => e.type === "extra");

  // 3) Si hay un bloqueo de TODO el día (start_time null), no hay slots base
  const fullDayBlocked = blocks.some((b) => b.start_time === null);

  // 4) Generar slots a partir de reglas
  const slots: TimeSlot[] = [];

  if (!fullDayBlocked) {
    for (const rule of dayRules) {
      pushSlotsFromRange(
        slots,
        date,
        rule.start_time,
        rule.end_time,
        rule.slot_duration_minutes
      );
    }
  }

  // 5) Agregar slots extras
  for (const extra of extras) {
    if (!extra.start_time || !extra.end_time) continue;
    pushSlotsFromRange(slots, date, extra.start_time, extra.end_time, 60);
  }

  // 6) Eliminar duplicados y ordenar
  const unique = new Map<string, TimeSlot>();
  for (const slot of slots) unique.set(slot.start, slot);
  let result = Array.from(unique.values()).sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  // 7) Marcar bloqueados (rango parcial)
  const partialBlocks = blocks.filter((b) => b.start_time && b.end_time);
  for (const block of partialBlocks) {
    const blockStart = combineDateTime(date, block.start_time!);
    const blockEnd = combineDateTime(date, block.end_time!);
    result = result.filter((slot) => {
      const slotStart = new Date(slot.start).getTime();
      return slotStart < blockStart.getTime() || slotStart >= blockEnd.getTime();
    });
  }

  // 8) Marcar como no disponibles los que tienen cita
  const bookedStarts = new Set(
    bookedAppointments
      .filter((a) => a.status !== "cancelled")
      .map((a) => new Date(a.starts_at).toISOString())
  );

  result = result.map((slot) => ({
    ...slot,
    available: !bookedStarts.has(new Date(slot.start).toISOString()),
  }));

  return result;
}

function pushSlotsFromRange(
  out: TimeSlot[],
  date: Date,
  startTime: string,
  endTime: string,
  durationMinutes: number
) {
  const start = combineDateTime(date, startTime);
  const end = combineDateTime(date, endTime);
  let current = start.getTime();
  const endMs = end.getTime();
  const stepMs = durationMinutes * 60 * 1000;

  while (current + stepMs <= endMs) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current + stepMs);
    out.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: true,
    });
    current += stepMs;
  }
}

// Ecuador no usa horario de verano: siempre UTC-5
const TZ = "America/Guayaquil";

function combineDateTime(date: Date, time: string): Date {
  // time es "HH:MM" o "HH:MM:SS"
  // Construimos el timestamp como hora Ecuador independiente del servidor
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  const dateStr = formatDateLocal(date);
  // Crear la fecha con offset explícito de Ecuador (-05:00)
  return new Date(`${dateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-05:00`);
}

export function formatDateLocal(d: Date): string {
  // Usar siempre zona Ecuador para obtener la fecha correcta
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // retorna YYYY-MM-DD
}

export function canCancel(appointmentStartsAt: string): boolean {
  // Política: cancelar con al menos 24 hs de antelación
  const start = new Date(appointmentStartsAt).getTime();
  const now = Date.now();
  const hoursUntil = (start - now) / (1000 * 60 * 60);
  return hoursUntil >= 24;
}

export function formatTimeLocal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // Formatear siempre en zona Ecuador, sin importar la zona del servidor
  const hh = parseInt(date.toLocaleString("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }));
  const mm = parseInt(date.toLocaleString("en-US", { timeZone: TZ, minute: "2-digit" }));
  const hours = String(hh === 24 ? 0 : hh).padStart(2, "0");
  const minutes = String(mm).padStart(2, "0");
  return minutes === "00" ? `${hours}H` : `${hours}H${minutes}`;
}
