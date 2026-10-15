# Sistema Liga Izurieta

Sistema administrativo web para la **Liga Deportiva Barrial José Ignacio Izurieta**.

Panel para gestionar jugadores, equipos, pagos, sanciones, calendario y actas
de la liga, con roles diferenciados por tipo de usuario.

---

## 📋 Índice

- [Descripción](#-descripción)
- [Estado del proyecto](#-estado-del-proyecto)
- [Módulos](#-módulos)
- [Roles y permisos](#-roles-y-permisos)
- [Tecnologías](#-tecnologías)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Scripts disponibles](#-scripts-disponibles)
- [Convenciones](#-convenciones)

---

## 📖 Descripción

Este proyecto es el **panel administrativo** de la liga. Se conecta a la misma
base de datos que la web pública, pero requiere autenticación y ofrece
funcionalidades según el rol del usuario.

**Proyectos relacionados:**

| Proyecto | URL | Descripción |
|---|---|---|
| Web Pública | [web-liga-izurieta.vercel.app](https://web-liga-izurieta.vercel.app) | Sitio público sin login |
| Panel Admin | (pendiente deploy) | Este proyecto |
| App Móvil Vocal/Árbitro | (pendiente) | Aplicación offline-first |

---

## 🚦 Estado del proyecto

**Fase actual: En desarrollo**

| Fase | Módulo | Estado |
|---|---|---|
| 1 | Login y autenticación | ✅ Completado |
| 2 | Header + Sidebar con roles | ✅ Completado |
| 3 | Módulo Jugadores (CRUD) | ✅ Completado |
| 4 | Importar Excel masivo | ✅ Completado |
| 5 | Módulo Usuarios | ✅ Completado |
| 6 | Módulo Equipos (CRUD) | ✅ Completado |
| 7 | Módulo Pagos | ✅ Completado |
| 8 | Módulo Calendario | ✅ Completado |
| 9 | Módulo Sanciones | ✅ Completado |
| 10 | Módulo Actas | ✅ Completado |
| 11 | Módulo Reportes | ✅ Completado |
| 12 | Módulo Presidente (Mis Jugadores) | ✅ Completado |
| 13 | Deploy en Vercel | ⏳ Listo para producción |

---

## 🎯 Módulos

### Módulo Jugadores ✅

**Funcionalidades:**
- Lista de jugadores con búsqueda y filtros (por disciplina, categoría, equipo, estado)
- Agregar jugador con formulario completo
- Editar datos del jugador
- Cambiar de equipo (registra historial automáticamente)
- Detalle completo del jugador (con sanciones, deudas e historial)
- Dar de baja del club (baja lógica, mantiene historial)
- Registrar pago del carnet digital
- Importar jugadores masivamente desde Excel

**Filtros de estado:**
- Solo activos en un club (por defecto)
- Sin equipo (dados de baja)
- Todos los jugadores

**Validaciones:**
- Cédula debe tener 10 dígitos
- Menores de 18 requieren datos del tutor (LOPDP)
- Tipo de pase requerido si no es "nuevo"
- Club anterior obligatorio si el pase no es "nuevo"

### Importador Excel ✅

**Formato del archivo:**
- 12 hojas, una por combinación de disciplina + categoría
- Columnas: Apellidos y Nombres, Cédula, Fecha de Nacimiento, Dorsal, Posición, Tipo de Pase, Club Anterior, datos del Tutor, Observaciones

**Proceso:**
1. Seleccionar equipo (dropdown)
2. Subir archivo `.xlsx`
3. Analizar y mostrar resumen (válidos, advertencias, errores)
4. Importar solo las filas válidas
5. Detección automática de duplicados

---

## 👥 Roles y permisos

| Rol | Descripción | Módulos disponibles |
|---|---|---|
| `admin` | Control total | Todos |
| `secretaria` | Administración general | Jugadores, Equipos, Pagos, Calendario, Sanciones, Actas, Reportes |
| `delegado` | Presidente de club | Mis Jugadores, Mi Club, Mis Pases, Mi Nómina |
| `capitan` | Capitán del equipo | Cerrar Acta |
| `vocal` | Vocal semanal | Planilla, Partido en Curso, Validar Carnets, Novedades |
| `arbitro` | Árbitro externo | Partido en Curso, Tarjetas, Goles, Novedades |

---

## 🛠 Tecnologías

| Herramienta | Versión | Uso |
|---|---|---|
| React | 19 | Framework principal |
| Vite | 8 | Build tool |
| React Router | 7 | Navegación |
| Tailwind CSS | 3 | Estilos |
| Supabase | 2 | Backend (BD, Auth, Storage) |
| Lucide React | Latest | Iconos |
| React Hot Toast | Latest | Notificaciones |
| xlsx | Latest | Lectura de archivos Excel |

**Base de datos:** PostgreSQL (vía Supabase, región São Paulo)

---

## 📁 Estructura del proyecto

```
liga-izurieta-admin/
├── public/
│   └── (favicon, etc)
├── src/
│   ├── assets/
│   │   └── escudo-liga.png         # Logo de la liga
│   ├── components/
│   │   ├── Header.jsx               # Barra superior
│   │   ├── Sidebar.jsx              # Menú lateral por rol
│   │   ├── Layout.jsx               # Envoltorio general
│   │   ├── ProtectedRoute.jsx       # Protección de rutas
│   │   ├── JugadorFormDrawer.jsx    # Formulario crear/editar jugador
│   │   └── JugadorDetalleDrawer.jsx # Detalle completo del jugador
│   ├── contexts/
│   │   └── AuthContext.jsx          # Manejo de autenticación
│   ├── lib/
│   │   └── supabase.js              # Cliente de Supabase
│   ├── pages/
│   │   ├── Login.jsx                # Inicio de sesión
│   │   ├── Dashboard.jsx            # Página principal
│   │   ├── Jugadores.jsx            # Lista de jugadores
│   │   └── ImportarJugadores.jsx    # Importación masiva
│   ├── App.jsx                      # Rutas principales
│   ├── main.jsx                     # Punto de entrada
│   └── index.css                    # Estilos globales
├── .env.local                       # Variables de entorno (NO subir a Git)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

---

## ⚙️ Instalación

### Requisitos previos

- Node.js 20 o superior
- npm 10 o superior
- Cuenta en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/lams1474/liga-izurieta-admin.git
cd liga-izurieta-admin

# 2. Instalar dependencias
npm install

# 3. Copiar el archivo de ejemplo de variables
cp .env.example .env.local

# 4. Editar .env.local con tus credenciales de Supabase
# (ver sección Configuración)

# 5. Arrancar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## 🔧 Configuración

### Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=https://gylnajxmlalnyueanhll.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE:** Este archivo **NO debe subirse a GitHub**. Ya está protegido
por `.gitignore`.

### Obtener las credenciales

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Abrir el proyecto **App-liga-Izurieta**
3. Ir a **Settings → API**
4. Copiar `Project URL` y `anon public key`

---

## 📜 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run preview` | Previsualiza la build de producción |
| `npm run lint` | Ejecuta ESLint |

---

## 📐 Convenciones

### Nombres de archivos

- **Componentes:** `PascalCase.jsx` (ej: `JugadorFormDrawer.jsx`)
- **Páginas:** `PascalCase.jsx` (ej: `Jugadores.jsx`)
- **Utilidades:** `camelCase.js` (ej: `supabase.js`)
- **Contextos:** `PascalCase.jsx` (ej: `AuthContext.jsx`)

### Estructura de un componente

```jsx
// 1. Imports
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// 2. Componente principal
export default function MiComponente() {
  // 3. Hooks (useState, useEffect, useNavigate, etc.)
  // 4. Estados
  // 5. Efectos
  // 6. Funciones auxiliares
  // 7. Funciones de eventos
  // 8. Render
}
```

### Estilos

- **Tailwind CSS** para todos los estilos
- Paleta personalizada:
  - `liga-azul` (#1e3a8a)
  - `liga-rojo` (#dc2626)
  - `liga-amarillo` (#fbbf24)
  - `liga-verde` (#16a34a)

### Idioma

- **Código:** en inglés cuando es convención (variables, funciones, etc.)
- **UI:** 100% en español
- **Comentarios:** en español
- **Commits:** en español

---

## 🔒 Seguridad

- Row Level Security (RLS) habilitado en **todas las tablas** de Supabase
- Políticas específicas por rol (admin, secretaria, delegado, etc.)
- Credenciales manejadas en variables de entorno
- Autenticación con Supabase Auth
- Sesión persistente y controlada
- Cumplimiento con Ley de Protección de Datos Personales (LOPDP) de Ecuador

---

## 📄 Licencia

Sistema propietario de la **Liga Deportiva Barrial José Ignacio Izurieta**.

Uso exclusivo de la liga y sus clubes afiliados.

---

## 👨‍💻 Autor

**Luis Maigua**
- GitHub: [@lams1474](https://github.com/lams1474)
- Email: ligajoseizurieta@gmail.com

---

## 🗓 Última actualización

Octubre 2026