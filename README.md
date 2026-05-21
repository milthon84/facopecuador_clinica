# Agenda de Citas — Consultorio

Aplicación web para agendar citas de un consultorio. Permite que cualquier persona reserve una cita sin necesidad de login, y le da al profesional un panel admin completo para administrar la agenda, los pacientes y los horarios.

## Características

**Para los pacientes (público, sin login):**
- Calendario con días disponibles
- Selección de horario libre
- Formulario de datos (cédula, nombre, teléfono, email, motivo)
- Autocompletado si ya fue paciente antes (busca por cédula o email)
- Confirmación inmediata + email de confirmación

**Para el admin (con login):**
- Dashboard con citas del día
- Calendario semanal completo
- Detalle de cada cita: marcar atendida / no asistió / cancelar
- Notas internas por cita
- Gestión de pacientes con historial de visitas
- Configuración de horarios base (lun-sáb, 60 min por cita)
- Bloqueos puntuales (vacaciones, feriados) y horarios extra
- Notificación por email al admin de cada cita nueva

**Otros:**
- Recordatorio automático por email 24 horas antes de la cita
- Diseño responsive (mobile + desktop)
- Paleta: dorado, blanco, lila, negro

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + iconos **lucide-react**
- **Supabase** (PostgreSQL + Auth)
- **Resend** para envío de emails
- **Vercel** para hosting + cron jobs

---

## Setup paso a paso

### 1. Crear proyecto en Supabase

1. Andá a https://supabase.com y creá una cuenta gratuita.
2. **New project** → ponele un nombre (ej: `agenda-consultorio`) y una contraseña.
3. Esperá ~2 minutos a que se aprovisione.

### 2. Ejecutar el schema SQL

1. En tu proyecto Supabase, ir a **SQL Editor** (en el menú lateral).
2. **New query**.
3. Copiar todo el contenido del archivo `supabase/schema.sql` y pegarlo.
4. Click en **Run** (Ctrl+Enter). Debería decir "Success".
5. Verificá que se crearon las tablas en **Table Editor**: `patients`, `appointments`, `availability_rules`, `availability_exceptions`. La tabla `availability_rules` ya viene cargada con el horario Lun-Sáb 9-12 y 13-16.

### 3. Crear el usuario admin

1. En Supabase, ir a **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email y contraseña a tu elección. **Marcar "Auto Confirm User"**.
3. Una vez creado, click sobre el usuario → **Edit user** → editar el campo **`user_metadata`** y dejarlo así:
   ```json
   { "role": "admin" }
   ```
4. Guardar.

### 4. Obtener las claves de Supabase

1. **Settings → API**.
2. Copiá los siguientes valores:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (la que dice "secret") → será `SUPABASE_SERVICE_ROLE_KEY`

### 5. Crear cuenta en Resend (para emails)

1. https://resend.com → crear cuenta.
2. **API Keys** → **Create API Key** → copiar el valor (`re_...`).
3. **Domains**: agregá tu dominio (si tenés). Si no, podés empezar usando `onboarding@resend.dev` solo para pruebas (limitado).
4. Para producción, agregar tu dominio y verificarlo con los registros DNS.

### 6. Configurar variables de entorno locales

1. Copiá el archivo `.env.example` y guardalo como `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Editá `.env.local` y completá todos los valores.

### 7. Instalar y correr

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 — vas a ver la landing pública.

Para el panel admin: http://localhost:3000/admin/login → entrá con el usuario que creaste.

---

## Deploy a Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "primer commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/agenda-citas.git
git push -u origin main
```

### 2. Importar en Vercel

1. https://vercel.com → **Add New** → **Project**.
2. Importar el repo de GitHub.
3. **Framework Preset:** Next.js (lo detecta solo).
4. **Environment Variables:** copiá todas las variables de tu `.env.local`. **MUY IMPORTANTE:** poné `NEXT_PUBLIC_SITE_URL` con la URL final de Vercel (ej: `https://agenda-citas.vercel.app`).
5. **Deploy.**

### 3. Configurar el cron de recordatorios

El archivo `vercel.json` ya tiene configurado el cron que corre todos los días a las 13:00 UTC (ajustá la hora según tu zona; por defecto manda recordatorios para las citas dentro de las próximas 18-30 horas).

Para que el cron pueda autenticarse, el endpoint pide un `Bearer <CRON_SECRET>` que Vercel manda automáticamente cuando configurás la variable `CRON_SECRET` en el entorno.

---

## Estructura del proyecto

```
agenda-citas/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing pública
│   │   ├── reservar/
│   │   │   ├── page.tsx                    # Flujo de reserva
│   │   │   └── confirmacion/[id]/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Layout protegido
│   │   │   ├── page.tsx                    # Dashboard hoy
│   │   │   ├── login/page.tsx
│   │   │   ├── calendario/page.tsx
│   │   │   ├── citas/[id]/page.tsx
│   │   │   ├── pacientes/page.tsx
│   │   │   ├── pacientes/[id]/page.tsx
│   │   │   ├── horarios/page.tsx
│   │   │   └── bloqueos/page.tsx
│   │   └── api/
│   │       ├── availability/route.ts       # GET slots disponibles
│   │       ├── appointments/route.ts       # POST nueva cita
│   │       ├── patients/lookup/route.ts    # GET por cédula/email
│   │       └── cron/reminders/route.ts     # Cron recordatorios
│   ├── components/
│   │   ├── SignOutButton.tsx
│   │   ├── AppointmentActions.tsx
│   │   ├── HorariosEditor.tsx
│   │   └── BloqueosEditor.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   ├── availability.ts                 # Cálculo de slots
│   │   ├── email.ts                        # Resend integration
│   │   └── supabase/
│   │       ├── client.ts                   # Browser client
│   │       ├── server.ts                   # SSR client (cookies)
│   │       └── admin.ts                    # Service role client
│   └── middleware.ts                       # Protección /admin
├── supabase/
│   └── schema.sql                          # DB + RLS + seed
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json                             # Cron config
```

---

## Configurar la paleta de colores

Los colores **dorado, blanco, lila y negro** están definidos en `tailwind.config.ts`. Si querés ajustarlos:

```ts
gold:  { 500: '#C9A961', ... }   // Dorado principal
lilac: { 400: '#B19CD9', ... }   // Lila
ink:   { 900: '#0F0F0F', ... }   // Negro
```

Cambialos a gusto y se reflejan en toda la app.

---

## Personalizar el consultorio

En `.env.local`:

```
NEXT_PUBLIC_CLINIC_NAME=Dr. Juan Pérez
NEXT_PUBLIC_CLINIC_ADDRESS=Calle 123 #45-67, Ciudad
NEXT_PUBLIC_CLINIC_PHONE=+57 300 000 0000
```

Estos valores aparecen en la landing, los emails y el panel.

---

## Reglas de negocio actuales

- **Slot duration:** 60 minutos por cita (configurable desde `/admin/horarios`).
- **Horario base:** Lun-Sáb 09:00–12:00 y 13:00–16:00 (configurable).
- **Cancelaciones del paciente:** requieren contactar al consultorio. El admin puede cancelar desde el panel.
- **Buffer mínimo:** 24 horas antes de la cita (para política de cancelación).
- **Anti-doble-reserva:** índice único en la base de datos sobre `starts_at` para citas no canceladas.

---

## Próximas mejoras posibles

- [ ] WhatsApp / SMS además de email (Twilio)
- [ ] Link en el email para que el paciente cancele/reprograme por su cuenta
- [ ] Vista de calendario tipo Google Calendar (FullCalendar)
- [ ] Múltiples profesionales
- [ ] Exportar citas a iCal / Google Calendar
- [ ] Historial clínico por paciente con campos personalizables
- [ ] Reportes (citas atendidas vs canceladas, pacientes nuevos, etc.)

---

## Troubleshooting

**No me deja loguear como admin:**
- Verificá que el usuario tenga `{"role": "admin"}` en `user_metadata` desde Supabase Authentication.
- Que las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén bien.

**No salen los emails:**
- En Resend, verificá que tengas un dominio verificado.
- Si todavía no, usá `onboarding@resend.dev` en `RESEND_FROM_EMAIL` para pruebas (solo permite enviar a la cuenta dueña del API key).

**No aparecen slots disponibles:**
- Andá a `/admin/horarios` y verificá que haya reglas activas para el día de la semana correspondiente.
- Verificá que no haya un bloqueo de ese día en `/admin/bloqueos`.

**Error "Ese horario ya fue tomado":**
- Es correcto. Otra persona reservó ese slot mientras estabas eligiendo. Recargá y elegí otro.

---

## Licencia

MIT — usalo como quieras.
