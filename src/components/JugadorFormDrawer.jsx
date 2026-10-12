import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function JugadorFormDrawer({ abierto, onCerrar, jugadorEditar, onGuardado }) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria'
  const esPresidente = usuario?.rol === 'delegado'

  const [cargando, setCargando] = useState(false)
  const [equipos, setEquipos] = useState([])
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    fecha_nacimiento: '',
    telefono: '',
    tipo_pase: 'nuevo',
    club_anterior: '',
    equipo_id: '',
    dorsal: '',
    posicion: '',
    tutor_nombre: '',
    tutor_cedula: '',
    tutor_telefono: '',
  })

  const [errores, setErrores] = useState({})

  // Calcular si es menor de edad
  const esMenor = (() => {
    if (!form.fecha_nacimiento) return false
    const hoy = new Date()
    const nacimiento = new Date(form.fecha_nacimiento)
    const edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    const edadFinal = mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())
      ? edad - 1
      : edad
    return edadFinal < 18
  })()

  // Cargar equipos (solo si es admin/secretaria)
  useEffect(() => {
    async function cargarEquipos() {
      if (!esAdmin) return

      const { data } = await supabase
        .from('equipos')
        .select('id, nombre, disciplina, categoria')
        .eq('activo', true)
        .order('nombre')

      setEquipos(data || [])
    }
    cargarEquipos()
  }, [esAdmin])

  // Si hay jugador a editar, cargar sus datos
  useEffect(() => {
    async function cargarJugador() {
      if (!jugadorEditar) {
        setForm({
          nombres: '',
          apellidos: '',
          cedula: '',
          fecha_nacimiento: '',
          telefono: '',
          tipo_pase: 'nuevo',
          club_anterior: '',
          equipo_id: '',
          dorsal: '',
          posicion: '',
          tutor_nombre: '',
          tutor_cedula: '',
          tutor_telefono: '',
        })
        setErrores({})
        return
      }

      // Cargar datos del jugador
      const { data: jugador } = await supabase
        .from('jugadores')
        .select(`
          *,
          inscripciones:jugador_equipo (
            id, dorsal, posicion, activo,
            equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria)
          )
        `)
        .eq('id', jugadorEditar.id)
        .single()

      if (jugador) {
        const insc = jugador.inscripciones?.find((i) => i.activo)

        setForm({
          nombres: jugador.nombres || '',
          apellidos: jugador.apellidos || '',
          cedula: jugador.cedula || '',
          fecha_nacimiento: jugador.fecha_nacimiento || '',
          telefono: jugador.telefono || '',
          tipo_pase: jugador.tipo_pase || 'nuevo',
          club_anterior: jugador.club_anterior || '',
          equipo_id: insc?.equipo?.id || '',
          dorsal: insc?.dorsal || '',
          posicion: insc?.posicion || '',
          tutor_nombre: jugador.tutor_nombre || '',
          tutor_cedula: jugador.tutor_cedula || '',
          tutor_telefono: jugador.tutor_telefono || '',
        })
      }
    }

    if (abierto) cargarJugador()
  }, [jugadorEditar, abierto])

  // Actualizar campo
  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  // Validar formulario
  function validar() {
    const nuevosErrores = {}

    if (!form.nombres.trim()) nuevosErrores.nombres = 'Obligatorio'
    if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Obligatorio'
    if (!form.cedula.trim()) {
      nuevosErrores.cedula = 'Obligatorio'
    } else if (!/^\d{10}$/.test(form.cedula)) {
      nuevosErrores.cedula = 'Debe tener 10 dígitos'
    }
    if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Obligatorio'
    if (!form.tipo_pase) nuevosErrores.tipo_pase = 'Obligatorio'
    if (esAdmin && !form.equipo_id) nuevosErrores.equipo_id = 'Obligatorio'
    if (form.tipo_pase && form.tipo_pase !== 'nuevo' && !form.club_anterior.trim()) {
      nuevosErrores.club_anterior = 'Obligatorio si no es nuevo'
    }

    if (esMenor) {
      if (!form.tutor_nombre.trim()) nuevosErrores.tutor_nombre = 'Obligatorio para menores'
      if (!form.tutor_cedula.trim()) {
        nuevosErrores.tutor_cedula = 'Obligatorio para menores'
      } else if (!/^\d{10}$/.test(form.tutor_cedula)) {
        nuevosErrores.tutor_cedula = 'Debe tener 10 dígitos'
      }
      if (!form.tutor_telefono.trim()) nuevosErrores.tutor_telefono = 'Obligatorio para menores'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // Guardar
  async function guardar() {
    if (!validar()) {
      toast.error('Revisa los campos marcados')
      return
    }

    setCargando(true)

    try {
      if (jugadorEditar) {
        // EDITAR jugador existente
        // 1. Actualizar datos del jugador
        const { error: errJugador } = await supabase
          .from('jugadores')
          .update({
            nombres: form.nombres.toUpperCase().trim(),
            apellidos: form.apellidos.toUpperCase().trim(),
            cedula: form.cedula.trim(),
            fecha_nacimiento: form.fecha_nacimiento,
            telefono: form.telefono.trim() || null,
            tipo_pase: form.tipo_pase,
            club_anterior: form.club_anterior.trim() || null,
            tutor_nombre: esMenor ? form.tutor_nombre.toUpperCase().trim() : null,
            tutor_cedula: esMenor ? form.tutor_cedula.trim() : null,
            tutor_telefono: esMenor ? form.tutor_telefono.trim() : null,
          })
          .eq('id', jugadorEditar.id)

        if (errJugador) throw errJugador

        // 2. Verificar si cambió de equipo (solo si es admin/secretaria)
        if (esAdmin) {
          // Inscripción activa actual
          const inscripcionActual = jugadorEditar.inscripciones?.find((i) => i.activo)
          const equipoActualId = inscripcionActual?.equipo?.id
          const equipoNuevoId = form.equipo_id

          if (equipoNuevoId && equipoNuevoId !== equipoActualId) {
            const hoy = new Date().toISOString().split('T')[0]

            // 2.1. Cerrar inscripción actual
            if (inscripcionActual) {
              await supabase
                .from('jugador_equipo')
                .update({ activo: false })
                .eq('id', inscripcionActual.id)

              await supabase
                .from('historial_clubes_jugador')
                .update({ fecha_hasta: hoy })
                .eq('jugador_id', jugadorEditar.id)
                .eq('equipo_id', equipoActualId)
                .is('fecha_hasta', null)
            }

            // 2.2. Crear nueva inscripción
            const { error: errInsc } = await supabase
              .from('jugador_equipo')
              .insert({
                jugador_id: jugadorEditar.id,
                equipo_id: equipoNuevoId,
                dorsal: form.dorsal ? parseInt(form.dorsal) : null,
                posicion: form.posicion.trim() || null,
                activo: true,
              })

            if (errInsc) throw errInsc

            // 2.3. Registrar en historial
            const { data: equipoData } = await supabase
              .from('equipos')
              .select('disciplina, categoria')
              .eq('id', equipoNuevoId)
              .single()

            if (equipoData) {
              await supabase.from('historial_clubes_jugador').insert({
                jugador_id: jugadorEditar.id,
                equipo_id: equipoNuevoId,
                disciplina: equipoData.disciplina,
                categoria: equipoData.categoria,
                temporada: '2026-2027',
                fecha_desde: hoy,
                tipo_movimiento: form.tipo_pase === 'nuevo' ? 'nuevo' : 'pase_entrada',
                registrado_por: usuario.id,
              })
            }

            toast.success('Jugador actualizado y transferido a nuevo equipo')
          } else {
            // No cambió de equipo, solo actualizar dorsal/posición
            if (inscripcionActual) {
              await supabase
                .from('jugador_equipo')
                .update({
                  dorsal: form.dorsal ? parseInt(form.dorsal) : null,
                  posicion: form.posicion.trim() || null,
                })
                .eq('id', inscripcionActual.id)
            }
            toast.success('Jugador actualizado')
          }
        } else {
          toast.success('Jugador actualizado')
        }
      } else {
        // CREAR jugador nuevo
        // Determinar equipo_id
        let equipoFinal = form.equipo_id
        if (esPresidente && usuario.club_id) {
          equipoFinal = usuario.club_id
        }

        if (!equipoFinal) {
          toast.error('Debe seleccionar un equipo')
          setCargando(false)
          return
        }

        // 1. Insertar jugador
        const { data: nuevoJugador, error: errJugador } = await supabase
          .from('jugadores')
          .insert({
            nombres: form.nombres.toUpperCase().trim(),
            apellidos: form.apellidos.toUpperCase().trim(),
            cedula: form.cedula.trim(),
            fecha_nacimiento: form.fecha_nacimiento,
            telefono: form.telefono.trim() || null,
            tipo_pase: form.tipo_pase,
            club_anterior: form.club_anterior.trim() || null,
            estado_pase: 'pendiente',
            calificado: false,
            consentimiento_firmado: false,
            foto_actualizada: false,
            tutor_nombre: esMenor ? form.tutor_nombre.toUpperCase().trim() : null,
            tutor_cedula: esMenor ? form.tutor_cedula.trim() : null,
            tutor_telefono: esMenor ? form.tutor_telefono.trim() : null,
          })
          .select()
          .single()

        if (errJugador) throw errJugador

        // 2. Inscribir en equipo
        const { error: errInscripcion } = await supabase
          .from('jugador_equipo')
          .insert({
            jugador_id: nuevoJugador.id,
            equipo_id: equipoFinal,
            dorsal: form.dorsal ? parseInt(form.dorsal) : null,
            posicion: form.posicion.trim() || null,
            activo: true,
          })

        if (errInscripcion) throw errInscripcion

        // 3. Registrar en historial
        const { data: equipoData } = await supabase
          .from('equipos')
          .select('disciplina, categoria')
          .eq('id', equipoFinal)
          .single()

        if (equipoData) {
          await supabase.from('historial_clubes_jugador').insert({
            jugador_id: nuevoJugador.id,
            equipo_id: equipoFinal,
            disciplina: equipoData.disciplina,
            categoria: equipoData.categoria,
            temporada: '2026-2027',
            fecha_desde: new Date().toISOString().split('T')[0],
            tipo_movimiento: form.tipo_pase === 'nuevo' ? 'nuevo' : 'pase_entrada',
            registrado_por: usuario.id,
          })
        }

        toast.success('Jugador agregado correctamente')
      }

      onGuardado?.()
      onCerrar?.()
    } catch (err) {
      console.error(err)
      if (err.message?.includes('duplicate')) {
        toast.error('Ya existe un jugador con esa cédula')
      } else {
        toast.error('Error al guardar: ' + err.message)
      }
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  const equipoDelPresidente = usuario?.club

  return (
    <>
      {/* Fondo oscuro */}
      <div
        onClick={onCerrar}
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              {jugadorEditar ? 'Editar Jugador' : 'Agregar Jugador'}
            </h2>
            <p className="text-xs text-liga-amarillo">
              {jugadorEditar ? 'Modifica los datos' : 'Llena todos los campos obligatorios'}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* SECCIÓN: Datos personales */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Datos Personales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombres}
                  onChange={(e) => actualizarCampo('nombres', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="JUAN MANUEL"
                />
                {errores.nombres && (
                  <p className="text-xs text-red-500 mt-1">{errores.nombres}</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => actualizarCampo('apellidos', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.apellidos ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="PEREZ GOMEZ"
                />
                {errores.apellidos && (
                  <p className="text-xs text-red-500 mt-1">{errores.apellidos}</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cédula <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) =>
                    actualizarCampo('cedula', e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${
                    errores.cedula ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0501234567"
                  maxLength={10}
                />
                {errores.cedula && (
                  <p className="text-xs text-red-500 mt-1">{errores.cedula}</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.fecha_nacimiento && (
                  <p className="text-xs text-red-500 mt-1">{errores.fecha_nacimiento}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) =>
                    actualizarCampo('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  placeholder="0991234567"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Alerta si es menor */}
            {esMenor && (
              <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    <strong>Jugador menor de edad.</strong> Es obligatorio llenar los datos del tutor (LOPDP).
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN: Tutor (solo si es menor) */}
          {esMenor && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
                Datos del Tutor
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre del Tutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.tutor_nombre}
                    onChange={(e) => actualizarCampo('tutor_nombre', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                      errores.tutor_nombre ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="MARIA GOMEZ"
                  />
                  {errores.tutor_nombre && (
                    <p className="text-xs text-red-500 mt-1">{errores.tutor_nombre}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Cédula del Tutor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.tutor_cedula}
                      onChange={(e) =>
                        actualizarCampo('tutor_cedula', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${
                        errores.tutor_cedula ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0501234567"
                      maxLength={10}
                    />
                    {errores.tutor_cedula && (
                      <p className="text-xs text-red-500 mt-1">{errores.tutor_cedula}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Teléfono del Tutor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.tutor_telefono}
                      onChange={(e) =>
                        actualizarCampo('tutor_telefono', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                        errores.tutor_telefono ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0991234567"
                      maxLength={10}
                    />
                    {errores.tutor_telefono && (
                      <p className="text-xs text-red-500 mt-1">{errores.tutor_telefono}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECCIÓN: Datos deportivos */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Datos Deportivos
            </h3>

            {/* Equipo (solo si es admin/secretaria) */}
            {esAdmin && (
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Equipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.equipo_id}
                  onChange={(e) => actualizarCampo('equipo_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.equipo_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.disciplina} · {eq.categoria})
                    </option>
                  ))}
                </select>
                {errores.equipo_id && (
                  <p className="text-xs text-red-500 mt-1">{errores.equipo_id}</p>
                )}
              </div>
            )}

            {/* Si es presidente, mostrar su club */}
            {esPresidente && equipoDelPresidente && (
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Equipo
                </label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  <strong>{equipoDelPresidente.nombre}</strong>
                  <div className="text-xs text-blue-600">
                    {equipoDelPresidente.disciplina} · {equipoDelPresidente.categoria}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Dorsal
                </label>
                <input
                  type="number"
                  value={form.dorsal}
                  onChange={(e) => actualizarCampo('dorsal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  placeholder="10"
                  min="1"
                  max="99"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Posición
                </label>
                <select
                  value={form.posicion}
                  onChange={(e) => actualizarCampo('posicion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
                >
                  <option value="">Seleccionar</option>
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Mediocampista">Mediocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Pase deportivo */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Pase Deportivo
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de Pase <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipo_pase}
                  onChange={(e) => actualizarCampo('tipo_pase', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
                >
                  <option value="nuevo">Nuevo (primera inscripción)</option>
                  <option value="club_club">Viene de otro club (misma liga)</option>
                  <option value="liga_liga">Viene de otra liga</option>
                  <option value="canton">Viene de otro cantón</option>
                  <option value="provincia">Viene de otra provincia</option>
                </select>
              </div>

              {form.tipo_pase !== 'nuevo' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Club Anterior <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.club_anterior}
                    onChange={(e) => actualizarCampo('club_anterior', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                      errores.club_anterior ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nombre del club anterior"
                  />
                  {errores.club_anterior && (
                    <p className="text-xs text-red-500 mt-1">{errores.club_anterior}</p>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-xs text-blue-800">
                <strong>Nota:</strong> El pase quedará como <strong>"pendiente"</strong> hasta que la secretaría lo apruebe.
              </div>
            </div>
          </section>
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button
            onClick={onCerrar}
            disabled={cargando}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={cargando}
            className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                {jugadorEditar ? 'Guardar cambios' : 'Agregar jugador'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}