# 📊 Diagnóstico de Salud Financiera — Sí Financia

App web para que emprendedores evalúen su salud financiera en 4 áreas clave.

## 🚀 Cómo publicar en Vercel

### 1. Variables de entorno necesarias
Copia `.env.local.example` como `.env.local` y llena los valores:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ADMIN_PASSWORD=
```

### 2. Base de datos
Corre el archivo `supabase-schema.sql` en el SQL Editor de Supabase.

### 3. Despliegue
Importa este repositorio en vercel.com y agrega las variables de entorno.

## 📁 Estructura
- `pages/index.js` — App principal del diagnóstico
- `pages/admin.js` — Panel de administrador con estadísticas
- `pages/api/` — Endpoints: guardar resultados, enviar email, panel admin
- `lib/supabase.js` — Conexión a Supabase
- `supabase-schema.sql` — Esquema de la base de datos
