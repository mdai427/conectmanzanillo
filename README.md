# ConectManzanillo

Plataforma comunitaria de inteligencia vial en tiempo real para el Puerto de Manzanillo, Colima, México.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS v3 + PWA
- **Backend:** Node.js 20 + Express 4 + Socket.io
- **Base de datos:** Supabase (PostgreSQL + Realtime + Auth)
- **Deploy:** Railway (monorepo)

## Setup local

### 1. Clonar e instalar dependencias

```bash
# Frontend
cd client && npm install

# Backend
cd ../server && npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env` en la raíz y llena los valores de Supabase.

```bash
cp .env.example .env
```

### 3. Base de datos

Ejecuta en el SQL Editor de Supabase:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql`

### 4. Correr en desarrollo

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

El cliente corre en `http://localhost:5173` con proxy al backend en `http://localhost:3000`.

## Deploy en Railway

1. Subir el repo a GitHub
2. Crear un proyecto en Railway y conectar el repo
3. Configurar las variables de entorno del `.env.example` en Railway Dashboard
4. Configurar los Secrets en GitHub para el CI/CD:
   - `RAILWAY_TOKEN`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`

El deploy se activa automáticamente con cada push a `main`.

## Secciones del puerto

| Zona | Slug |
|------|------|
| Segundo Acceso | `segundo-acceso` |
| Zona Confinada | `confinada` |
| Terminal ICTSI | `terminal-ictsi` |
| Terminal TMM | `terminal-tmm` |
| Patio Fiscal | `patio-fiscal` |
| Acceso Principal | `acceso-principal` |
| Libramiento | `libramiento` |
| Vialidad Interna | `vialidad-interna` |

## Arquitectura del motor de votos

Cada reporte tiene un peso ponderado por:
- **Reputación del usuario** (inicial: 1.00)
- **Decaimiento temporal** (lineal desde creación hasta expiración)
- **Confirmaciones/Contradicciones** (+10% / -15% por reacción)

El estado de cada zona se calcula automáticamente via trigger PostgreSQL al insertar un reporte.
