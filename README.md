# Panel de Vida

Aplicación personal de una sola página que reúne en un mismo lugar el calendario, el correo, las tareas y las alertas, y que envía un resumen por correo cada mañana.

- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS y shadcn/ui, Supabase (Postgres, Auth y RLS), Google Calendar y Gmail (solo lectura), Anthropic, Resend y Vercel Cron.
- **Un solo usuario:** solo `ALLOWED_EMAIL` puede iniciar sesión. Cualquier otra cuenta ve una pantalla de "Acceso denegado".
- **Varias cuentas de Google:** el login es con una cuenta, y puedes conectar varias cuentas de Google (por ejemplo, la personal y la universitaria) como fuentes de datos. La agenda y los correos combinan todas las cuentas conectadas.

## Secciones de `/`

1. **Hoy en una línea:** número de reuniones, horas libres y la tarea más importante. Aquí también está el botón "Enviar resumen ahora".
2. **Agenda:** línea de tiempo del día. Marca los conflictos y las reuniones con menos de 15 minutos de separación, y muestra como "tiempo disponible" los bloques libres de más de 45 minutos (dentro de la jornada de 8:00 a 19:00). Tiene un selector para ver los próximos 7 días.
3. **Correos:** hilos de las últimas 48 horas sin leer o sin respuesta, más los de remitentes prioritarios. Claude los clasifica con salida JSON estructurada en tres grupos:
   - `responder_hoy`
   - `esperando_respuesta`: la regla es fija, sin IA. Son los hilos donde el último mensaje es tuyo y tiene más de 3 días.
   - `informativo`: solo se muestra el conteo.

   La clasificación se guarda en `email_classifications`, y un hilo solo se reclasifica si recibe un mensaje nuevo.
4. **Tareas:** CRUD completo, agrupado en vencidas, hoy, próximos 3 días y "más adelante". Puedes crear una tarea en una sola línea, por ejemplo "pagar luz el viernes", y Claude interpreta la fecha.
5. **Alertas cruzadas:**
   - Correos que mencionan una fecha o reunión que no está en el calendario.
   - Reuniones de hoy sin enlace ni descripción.
   - Tareas que vencen hoy sin tiempo libre suficiente. Se estiman 90, 60 y 30 minutos según la prioridad alta, media o baja.
   - Días con más de 6 horas de reuniones.
6. **Estado de conexiones:** cada cuenta de Google con su última sincronización y un botón para reconectar.

## Seguridad

- **Solo lectura.** Se piden únicamente los scopes `calendar.readonly` y `gmail.readonly`, y el código solo hace peticiones `GET` a Google. La app nunca envía, borra ni modifica correos ni eventos.
- **Refresh tokens cifrados.** Se guardan con AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) en la tabla `integrations`. El access token se renueva automáticamente antes de cada llamada.
- **RLS en las 4 tablas.** Cada fila solo es visible para su `user_id`. El cron no tiene sesión, así que usa la service role key solo en el servidor y filtra siempre por el usuario permitido.
- **`/api/cron/daily-brief` protegida.** Valida `Authorization: Bearer $CRON_SECRET` con una comparación de tiempo constante en cada ejecución.
- **Llaves fuera del código.** Todas están en variables de entorno, y `.env*` está en `.gitignore`.
- **Correos tratados como datos.** El texto de los correos se pasa a Claude como datos, no como instrucciones, y se escapa antes de generar el HTML del resumen.

## ¿Por qué la app de Google Cloud se queda en modo "Testing"?

`gmail.readonly` es un scope **restringido**. Para publicar una app que lo use (modo "In production"), Google exige una verificación formal: revisión de la política de privacidad y del dominio, y una evaluación de seguridad CASA hecha por un tercero, que suele costar dinero y tardar semanas. Para una app personal eso no tiene sentido.

En modo **Testing**, la app funciona sin verificación para los usuarios de prueba que agregues (hasta 100). Ten en cuenta dos limitaciones:

- **El refresh token caduca a los 7 días.** Cuando pase, la sección "Estado de conexiones" mostrará un error y bastará con pulsar **Reconectar**.
- **Solo pueden conectarse los correos que agregues como usuarios de prueba.**
- **Si una cuenta es de Google Workspace** (por ejemplo, la universitaria), el administrador del dominio puede bloquear apps no verificadas que pidan scopes de Gmail. En ese caso esa cuenta no podrá conectarse, aunque la personal siga funcionando.

## Instalación local

Requisitos: Node 20 o superior, y un proyecto de Supabase y otro de Google Cloud configurados según la sección siguiente.

```bash
npm install
cp .env.example .env.local   # completa los valores
npm run dev                  # http://localhost:3000
```

Para probar el cron en local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-brief
```

Antes de hacer commit, corre:

```bash
npm run build && npx tsc --noEmit && npm run lint
```

## Configuración de servicios (pasos manuales)

### Supabase

1. Crea un proyecto en https://supabase.com.
2. En el SQL Editor, ejecuta `supabase/migrations/20261119000000_init.sql`. Si usas la CLI, también puedes correr `npx supabase link` y luego `npx supabase db push`.
3. En **Authentication → Providers → Google**, actívalo y pega el Client ID y el Client Secret de Google (ver abajo).
4. En **Authentication → URL Configuration**:
   - En **Site URL**, pon la URL de Vercel (`https://<tu-app>.vercel.app`).
   - En **Redirect URLs**, agrega `http://localhost:3000/auth/callback` y `https://<tu-app>.vercel.app/auth/callback`.
5. En **Project Settings → API**, copia la URL, la `anon key` y la `service_role key`.

### Google Cloud

1. Crea un proyecto en https://console.cloud.google.com.
2. En **APIs & Services → Library**, activa **Google Calendar API** y **Gmail API**.
3. En **OAuth consent screen** (Google Auth Platform):
   - Elige el tipo **External**.
   - Agrega los scopes `openid`, `email`, `.../auth/calendar.readonly` y `.../auth/gmail.readonly`.
   - Deja el estado de publicación en **Testing**.
   - En **Test users**, agrega tus dos correos.
4. En **Credentials → Create credentials → OAuth client ID**, crea uno de tipo **Web application**:
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://<tu-app>.vercel.app`
   - **Authorized redirect URIs:**
     - `https://<proyecto>.supabase.co/auth/v1/callback` (login de Supabase)
     - `http://localhost:3000/api/google/callback`
     - `https://<tu-app>.vercel.app/api/google/callback`
5. Usa el Client ID y el Client Secret en Supabase y en las variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

### Resend

1. Crea una API key en https://resend.com.
2. Sin un dominio verificado, solo puedes enviar desde `onboarding@resend.dev`, y únicamente al correo con el que creaste la cuenta de Resend. Usa ese correo en `BRIEF_TO_EMAIL`, o verifica un dominio propio y cambia `RESEND_FROM`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role. Solo se usa en el servidor, para el cron |
| `ALLOWED_EMAIL` | Único correo que puede iniciar sesión |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client de Google Cloud |
| `TOKEN_ENCRYPTION_KEY` | Se genera con `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Llave de la API de Anthropic |
| `ANTHROPIC_MODEL` | Opcional. Por defecto `claude-sonnet-5-5` |
| `RESEND_API_KEY` | Llave de Resend |
| `RESEND_FROM` | Opcional. Por defecto `Panel de Vida <onboarding@resend.dev>` |
| `BRIEF_TO_EMAIL` | Opcional. Destino del resumen; por defecto `ALLOWED_EMAIL` |
| `CRON_SECRET` | Se genera con `openssl rand -hex 32` |
| `APP_TIMEZONE` | Opcional. Por defecto `America/Bogota` |
| `PRIORITY_SENDERS` | Opcional. Correos separados por comas |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local, o la URL de Vercel en producción |

## Despliegue en Vercel

1. En https://vercel.com/new, importa el repositorio de GitHub. El framework se detecta solo como Next.js.
2. En **Settings → Environment Variables**, carga todas las variables de la tabla anterior. `NEXT_PUBLIC_APP_URL` debe ser la URL final.
3. Despliega. Vercel lee `vercel.json` y registra el cron `45 11 * * *`, que corresponde a las 6:45 a. m. en Bogotá (UTC−5, sin horario de verano). Vercel envía `CRON_SECRET` automáticamente como header `Authorization`.
4. Actualiza las URLs de Vercel en Google Cloud y en Supabase (pasos anteriores).
5. Abre la app, inicia sesión y conecta tus cuentas de Google en "Estado de conexiones".

> **Plan Hobby de Vercel:** los cron jobs diarios pueden ejecutarse en cualquier momento dentro de la hora programada (11:00–11:59 UTC). Si necesitas que el resumen llegue exactamente a las 6:45, usa el plan Pro, o adelanta el cron (por ejemplo, `0 11 * * *`) para asegurarte de que llegue antes.

Para cambiar la hora del resumen, convierte la hora local a UTC y edita `schedule` en `vercel.json`.

## Estructura

```
app/                 páginas, route handlers (api/), server actions (actions/)
components/panel/    secciones del panel
components/ui/       shadcn/ui
lib/                 lógica: google/, supabase/, agenda, alertas, correos, resumen, cifrado
proxy.ts             protege rutas (sesión + correo permitido)
supabase/migrations/ esquema y políticas RLS
vercel.json          cron diario
```
