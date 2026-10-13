# CONTEXTO DEL PROYECTO — Liga Deportiva Barrial José Ignacio Izurieta

## Información general

Estoy construyendo un sistema digital completo para la **Liga Deportiva Barrial José Ignacio Izurieta** en Ecuador.

**Repositorios en GitHub:**
- Documentación: https://github.com/lams1474/liga-izurieta-docs
- Web pública: https://github.com/lams1474/web-liga-izurieta
- Panel admin: https://github.com/lams1474/liga-izurieta-admin

**URLs en producción:**
- Web pública: https://web-liga-izurieta.vercel.app
- Panel admin: (pendiente deploy)

**Supabase:**
- Proyecto: `App-liga-Izurieta`
- URL: https://gylnajxmlalnyueanhll.supabase.co
- Región: São Paulo (SA-EAST-1)
- Dashboard: https://supabase.com/dashboard/project/gylnajxmlalnyueanhll

**Credenciales admin:**
- Email: ligajoseizurieta@gmail.com
- Contraseña: lams1474

## Ecosistema del proyecto

1. **Base de datos (Supabase):** 23 tablas, 12+ funciones, 6 triggers, 6 vistas, políticas RLS por rol
2. **Web pública (React):** https://web-liga-izurieta.vercel.app — sin login, muestra tabla, goleadores, sancionados, calendario, verificar carnet
3. **Panel admin (React):** en desarrollo — login con roles, módulos para administrar todo
4. **App móvil (futuro):** Flutter, offline-first para vocal/árbitro

## Stack técnico

- React 19 + Vite 8 + Tailwind CSS 3 + React Router 7
- Supabase 2 (Auth + DB + Storage + Edge Functions)
- Vercel (hosting)
- Lucide React (iconos)
- React Hot Toast (notificaciones)
- xlsx (importador Excel)

## Base de datos — Estructura principal

### Tablas (23)
usuarios, equipos, jugadores, jugador_equipo, etapas, configuracion_multas,
reglas_disciplina, sanciones_jugador, sanciones_equipo, amarillas_acumuladas,
deudas_equipo, deudas_jugador, fechas, partidos, goles, arbitros, actas,
firmas_acta, carnets, pagos_carnet, pases_jugador, periodos_inscripcion,
historial_clubes_jugador

### Tipos ENUM
- **rol_usuario:** admin, secretaria, vocal, arbitro, delegado, jugador, capitan
- **disciplina:** futsala, futbol, ecuavoly
- **categoria:** hombres, mujeres, sub12, master40
- **tipo_sancion:** amarilla, roja, doble_amarilla, suspension_admin
- **tipo_gol:** normal, penal, autogol
- **estado_acta:** abierta, firmando, cerrada
- **tipo_firmante:** arbitro, vocal, capitan_local, capitan_visitante
- **tipo_sancion_equipo:** economica, deportiva, administrativa

### Funciones principales
- `validar_carnet(jugador_id, equipo_id)` → estado + motivos
- `calcular_tabla_posiciones(disciplina, categoria)`
- `calcular_tabla_goleadores(disciplina, categoria)`
- `calcular_tabla_sancionados(disciplina, categoria)`
- `registrar_pago_carnet(...)`
- `es_admin_o_secretaria()`, `obtener_rol_usuario()`, `periodo_inscripcion_activo()`
- `obtener_periodo_activo()`

### Triggers
- `trg_calcular_es_menor` — marca menores automáticamente
- `trg_generar_codigo_interno` — genera JUG-XXXXX
- `trg_generar_deuda_por_sancion` — crea deuda por roja/doble amarilla
- `trg_manejar_amarillas` — acumulación de amarillas (4=1 fecha)
- `trg_actualizar_sanciones` — incrementa fechas cumplidas
- `trg_verificar_cierre_acta` — cierra acta al firmar árbitro + vocal

### Vistas
- `vista_tabla_posiciones`
- `vista_goleadores`
- `vista_sancionados`
- `vista_carnet_jugador`
- `vista_deudas_pendientes`
- `vista_fair_play`

## Roles del sistema

| Rol en BD | Visible en UI | Descripción |
|---|---|---|
| admin | Administrador | Control total |
| secretaria | Secretaría | Administración general |
| delegado | Presidente | Gestión de su club |
| vocal | Vocal | Planilla semanal |
| arbitro | Árbitro | Goles/tarjetas |
| capitan | Capitán | Firma actas |
| jugador | (futuro) | App del jugador |

## Fechas de las temporadas 2026-2027

- **Futsala:** 20 de noviembre 2026 — junio 2027
- **Fútbol Senior:** enero 2027 — agosto 2027
- **Sub-12:** comparte con adultos
- **Master 40:** solo hombres, desde 37 años

## Reglas de negocio

### Validación del carnet (BLOQUEADO si alguna)
1. Carnet digital no pagado del año
2. No firmó consentimiento LOPDP
3. No tiene foto actualizada
4. No cumple edad reglamentaria
5. Pase deportivo no aprobado
6. Sanción activa pendiente
7. Deuda pendiente del jugador
8. Deuda pendiente del equipo

### Tarjetas
- Amarilla: acumula, multa $1
- 4 amarillas: 1 fecha suspensión + reinicio
- Doble amarilla: 1 fecha + multa $2 + resta 2 amarillas
- Roja directa: 2 fechas + multa $2
- Fin de etapa: se borran todas las amarillas

### Carnet digital
- Costo: $1 por jugador
- Anual
- Obligatorio

### Categorías
- hombres, mujeres, sub12, master40

### Disciplinas
- futbol, futsala, ecuavoly

## Estado actual del desarrollo

### Backend (Supabase) ✅ COMPLETO
- 23 tablas, ENUMs, índices
- 12+ funciones PL/pgSQL
- 6 triggers automatizados
- 6 vistas de consulta
- Políticas RLS por rol
- Datos: 12 equipos, ~5 usuarios (prueba), 0 jugadores

### Web pública ✅ EN PRODUCCIÓN
https://web-liga-izurieta.vercel.app

Páginas:
- Inicio
- Tabla de posiciones (filtros por disciplina/categoría)
- Goleadores (con podio 🥇🥈🥉)
- Sancionados (con colores por tipo)
- Calendario (pestañas Próximos/Resultados)
- Verificar carnet (por cédula, muestra todos los motivos)

### Panel admin 🚧 EN DESARROLLO
- ✅ Login + autenticación (Supabase Auth)
- ✅ Header + Sidebar por rol
- ✅ Módulo Jugadores (CRUD + import Excel + detalle + baja lógica)
- ✅ Módulo Usuarios (CRUD + Edge Function + período inscripción)
- ⏳ Módulo Equipos
- ⏳ Módulo Pagos
- ⏳ Módulo Calendario
- ⏳ Módulo Sanciones
- ⏳ Módulo Actas
- ⏳ Módulo Reportes
- ⏳ Módulo Configuración
- ⏳ Módulos por rol (Presidente, Vocal, Árbitro, Capitán)
- ⏳ Deploy en Vercel

### Edge Function ✅ COMPLETA
- `crear-usuario` — crea usuarios en Auth + tabla usuarios
- Valida que sea admin
- Usa `service_role_key` de los secrets por defecto

### App móvil ⏳ PENDIENTE
- Flutter, offline-first
- Vocal + Árbitro

## Módulos completados en detalle

### Módulo Jugadores
- Lista con filtros (búsqueda, disciplina, categoría, equipo, estado)
- Formulario crear/editar con drawer
- Validaciones (cédula 10 dígitos, tutor si menor, club anterior si pase≠nuevo)
- Detección automática de menor de edad
- Generación automática de código JUG-XXXXX
- Inscripción en jugador_equipo
- Registro en historial_clubes_jugador
- Detalle completo (datos, sanciones, deudas, carnet, historial)
- Baja lógica del club (mantiene historial)
- Cambio de equipo (registra pase en historial)
- Registrar pago de carnet
- Importar Excel masivo con detección de duplicados
- Códigos de color por estado

### Módulo Usuarios
- Lista con filtros (búsqueda, rol, estado)
- 6 tarjetas de resumen por rol
- Formulario crear/editar con drawer
- Roles: admin, secretaria, delegado (Presidente), vocal, arbitro, capitan
- Asignación de club para delegados y capitanes
- Generador de contraseñas aleatorias
- Edge Function `crear-usuario` para crear en Auth + tabla
- Período de inscripción:
  - Activar con duración configurable (por defecto 8 días)
  - Botones rápidos: 3, 5, 8, 15 días
  - Tarjeta amarilla con cuenta regresiva
  - Cerrar anticipadamente
  - Editar duración

## Notas importantes

- Los roles técnicos difieren de los visibles: `delegado` = "Presidente" en UI
- El rol `jugador` existe en BD pero no se usa aún (para App futura)
- Los presidentes solo verán/editarán datos de su club (RLS)
- Los vocales son presidentes designados semanalmente
- Los capitanes firman el acta junto con vocal y árbitro
- Sistema cumple LOPDP (consentimiento, tutores para menores)

## Instrucciones para el asistente

Cuando retome este proyecto en un chat nuevo, necesito que:

1. Mantengas el idioma español en todas las respuestas
2. Sigas el patrón de código establecido (drawers laterales, contexto de auth, etc.)
3. Continúes construyendo módulos uno por uno (no adelantes pasos)
4. Verifiques cada paso antes de avanzar al siguiente
5. Uses los colores de la liga: liga-azul (#1e3a8a), liga-rojo (#dc2626), liga-amarillo (#fbbf24), liga-verde (#16a34a)
6. Respetes las convenciones: componentes PascalCase, funciones camelCase, comentarios en español
7. Cuando el usuario tenga dudas técnicas, expliques claramente sin asumir conocimiento
8. Continúes con el patrón de commits después de cada avance
9. Si un módulo está en progreso, continúes desde donde se quedó
10. Siempre preguntes qué módulo sigue antes de avanzar

## Última sesión

Fecha: 13 de octubre de 2026
Estado: Módulo Usuarios recién completado (lista, formulario, Edge Function, período de inscripción)
Siguiente paso sugerido: Deploy del panel admin en Vercel o Módulo Equipos





Hola, retomo este proyecto. Acabo de terminar [X módulo] y quiero 
continuar con [Y módulo]. Por favor confirma que entendiste el 
contexto y dime por dónde empezamos.