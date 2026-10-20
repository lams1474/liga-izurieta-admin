# Sistema Liga Izurieta - Panel Administrativo

Sistema administrativo web para la **Liga Deportiva Barrial José Ignacio Izurieta**.

Panel central para gestionar jugadores, equipos, usuarios, pagos, sanciones, calendario y actas de la liga, con roles de acceso diferenciados (Admin, Secretaría, Presidente, Árbitro, etc.).

---

## 📋 Índice

- [Descripción](#-descripción)
- [Estado del proyecto](#-estado-del-proyecto)
- [Módulos y Funcionalidades](#-módulos-y-funcionalidades)
- [Roles y permisos](#-roles-y-permisos)
- [Tecnologías](#-tecnologías)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Scripts disponibles](#-scripts-disponibles)
- [Seguridad](#-seguridad)

---

## 📖 Descripción

Este proyecto es el **panel administrativo y de gestión** de la liga. Se conecta a la misma base de datos que la web pública, pero requiere autenticación (Supabase Auth) y ofrece funcionalidades específicas según el rol del usuario.

**Proyectos relacionados:**

| Proyecto | URL | Descripción |
|---|---|---|
| Web Pública | [web-liga-izurieta.vercel.app](https://web-liga-izurieta.vercel.app) | Sitio público sin login |
| Panel Admin | [liga-izurieta-admin.vercel.app](https://liga-izurieta-admin.vercel.app) | Este proyecto (Producción) |
| App Móvil (Futuro) | (pendiente) | Aplicación offline-first para Vocal/Árbitro |

---

## 🚦 Estado del proyecto

**Fase actual: ✅ Completado y en Producción**

| Fase | Módulo | Estado |
|---|---|---|
| 1 | Login y autenticación con Roles | ✅ Completado |
| 2 | Header + Sidebar dinámico por rol | ✅ Completado |
| 3 | Módulo Jugadores (CRUD + Fotos + LOPDP) | ✅ Completado |
| 4 | Importar Excel masivo | ✅ Completado |
| 5 | Módulo Usuarios (Edge Function + Períodos) | ✅ Completado |
| 6 | Módulo Equipos (Escudos y Plantillas) | ✅ Completado |
| 7 | Módulo Pagos (Carnets y Cuotas de Equipos) | ✅ Completado |
| 8 | Módulo Calendario (Etapas, Fechas, Partidos) | ✅ Completado |
| 9 | Módulo Sanciones y Deudas | ✅ Completado |
| 10 | Módulo Actas (Planilla, Goles, Tarjetas, PDF Oficial) | ✅ Completado |
| 11 | Módulo Reportes Financieros y Estadísticos | ✅ Completado |
| 12 | Módulo Configuración (Multas y Carnets) | ✅ Completado |
| 13 | Panel del Presidente (Jugadores, Club, Nómina) | ✅ Completado |
| 14 | Deploy en Vercel | ✅ Completado |

---

## 🎯 Módulos y Funcionalidades

### 1. Gestión de Jugadores
- Lista con búsqueda y filtros (disciplina, categoría, club, estado).
- Crear/Editar jugadores con validación de cédula y LOPDP (tutores para menores).
- Subida de foto (cámara o archivo) con compresión automática.
- Importador masivo desde Excel.
- Generación automática de código interno (`JUG-XXXXX`).
- Gestión de pases (cambio de club con historial automático).

### 2. Gestión de Equipos
- Vista general de los 12 clubes en sus diferentes categorías (Fútbol, Futsala, Ecuavoly).
- Subida y corrección de escudos.
- Visualización de plantillas completas.
- Activar/Desactivar equipos.

### 3. Gestión de Usuarios
- Creación de cuentas para presidentes, árbitros, capitanes y vocales mediante **Supabase Edge Functions** (creación segura usando `service_role`).
- Asignación de clubes a presidentes.
- Activación de **Períodos de Inscripción** (por defecto 8 días) con cuenta regresiva para los presidentes.

### 4. Calendario y Partidos
- Creación de Etapas y Fechas (jornadas).
- Programación de partidos (Local vs Visitante, cancha, hora, árbitro).
- Edición y eliminación de partidos programados.

### 5. Actas y Planillas
- Armado de planilla (Titulares/Suplentes).
- **Validación estricta:** Bloqueo automático de jugadores con carnet no pagado, sanciones o deudas.
- Validación de mínimos reglamentarios (Fútbol: 7 titulares, Futsala: 4 titulares).
- Registro en vivo de goles y tarjetas.
- Generación de **PDF Oficial de 2 páginas** idéntico al acta física de la liga.
- Flujo de firmas (Árbitro, Vocal, Capitanes) para el cierre del acta.

### 6. Pagos y Finanzas
- Cobro del Carnet Digital anual ($1).
- Cobro de multas generadas por tarjetas.
- Pestaña de "Deudas de Equipos" para registrar inscripciones o mensualidades.

### 7. Reportes y Estadísticas
- Dashboard financiero (Ingresos, deudas pendientes).
- Estadísticas del torneo (Partidos jugados, goles, equipos, jugadores).
- Barra de progreso de calificación de jugadores.

### 8. Panel del Presidente (Delegado)
- Vista "Mis Jugadores" (edición limitada al período de inscripción).
- Vista "Mi Club" (ver y subir escudo).
- Vista "Mi Nómina" (descarga en Excel y PDF).

---

## 👥 Roles y permisos

| Rol en BD | Nombre visible | Módulos disponibles |
|---|---|---|
| `admin` | Administrador | Todos los módulos |
| `secretaria` | Secretaría | Jugadores, Equipos, Pagos, Calendario, Sanciones, Actas, Reportes, Configuración |
| `delegado` | Presidente de Club | Mis Jugadores, Mi Club, Mi Nómina, Ver Sanciones |
| `capitan` | Capitán | Actas (Firma de partidos) |
| `vocal` | Vocal | Actas, Calendario |
| `arbitro` | Árbitro | Actas, Calendario |

---

## 🛠 Tecnologías

| Herramienta | Uso |
|---|---|
| React 19 | Framework principal |
| Vite | Build tool |
| React Router v7 | Navegación SPA |
| Tailwind CSS 3 | Estilos |
| Supabase | Backend (PostgreSQL, Auth, Storage, Edge Functions) |
| Lucide React | Iconos |
| React Hot Toast | Notificaciones |
| `jspdf` / `jspdf-autotable` | Generación de PDFs de Actas y Nóminas |
| `xlsx` | Lectura/escritura de archivos Excel |

---

## 📁 Estructura del proyecto

```text
liga-izurieta-admin/
├── src/
│   ├── assets/
│   │   └── escudo-liga.png         # Logo de la liga
│   ├── components/
│   │   ├── Header.jsx               # Barra superior
│   │   ├── Sidebar.jsx              # Menú lateral por rol
│   │   ├── Layout.jsx               # Envoltorio general
│   │   ├── ProtectedRoute.jsx       # Protección de rutas
│   │   ├── JugadorFormDrawer.jsx    # Formulario crear/editar jugador
│   │   ├── JugadorDetalleDrawer.jsx # Detalle completo del jugador
│   │   ├── UsuarioFormDrawer.jsx    # Crear/editar usuarios
│   │   └── PeriodoInscripcionDrawer.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx          # Manejo de autenticación y roles
│   ├── lib/
│   │   ├── supabase.js              # Cliente de Supabase
│   │   ├── imagenUtils.js           # Compresión de imágenes
│   │   ├── fotoUtils.js             # Subida de fotos a Storage
│   │   └── escudoUtils.js           # Subida de escudos a Storage
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Jugadores.jsx
│   │   ├── ImportarJugadores.jsx
│   │   ├── Usuarios.jsx
│   │   ├── Equipos.jsx
│   │   ├── Pagos.jsx
│   │   ├── Calendario.jsx
│   │   ├── Sanciones.jsx
│   │   ├── Actas.jsx
│   │   ├── Reportes.jsx
│   │   ├── Configuracion.jsx
│   │   ├── MisJugadores.jsx         # Panel Presidente
│   │   ├── MiClub.jsx               # Panel Presidente
│   │   └── MiNomina.jsx             # Panel Presidente
│   ├── App.jsx                      # Rutas principales
│   ├── main.jsx                     # Punto de entrada
│   └── index.css                    # Tailwind
├── .env.local                       # Variables de entorno (NO subir a Git)
├── package.json
├── tailwind.config.js
└── vite.config.js

## ⚙️ Instalación Local

### Requisitos previos
- Node.js 20 o superior
- npm 10 o superior
- Cuenta en Supabase

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/lams1474/liga-izurieta-admin.git
cd liga-izurieta-admin

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env.local con las credenciales
# (Ver sección de Configuración abajo)

# 4. Arrancar el servidor de desarrollo
npm run dev

La aplicación estará disponible en `http://localhost:5173`.

---

## 🔧 Configuración

### Variables de entorno (`.env.local`)

Crea un archivo llamado `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
VITE_SUPABASE_URL=https://gylnajxmlalnyueanhll.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 📜 Scripts disponibles
Comando	Descripción
npm run dev	Inicia el servidor de desarrollo
npm run build	Compila para producción
npm run preview	Previsualiza la build de producción
npm run lint	Ejecuta ESLint

## 🔒 Seguridad
Row Level Security (RLS) habilitado en todas las tablas de Supabase para proteger los datos según el rol del usuario.

Edge Function (crear-usuario): Utiliza la service_role_key de forma segura (del lado del servidor) para crear usuarios en Auth y en la tabla usuarios. La llave privada nunca se expone en el cliente.

Autenticación persistente y segura con Supabase Auth.

Cumplimiento estricto de la Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador (consentimiento informado y registro de tutores para menores de edad).

## 👨‍💻 Autor
Luis Maigua

GitHub: @lams1474

Email: ligajoseizurieta@gmail.com

Última actualización: Octubre 2026


---

### Para subirlo a GitHub:

```cmd
cd C:\Users\USER\Desktop\liga-izurieta-admin
git add README.md
git commit -m "Docs: formatear correctamente seccion final del README"
git push