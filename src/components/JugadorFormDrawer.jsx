/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { X, Save, Camera, Image as ImageIcon, Trash2, Loader, Search, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { comprimirImagen, validarImagen } from '../lib/imagenUtils'
import { subirFotoJugador, eliminarFotoJugador } from '../lib/fotoUtils'
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
  
  // NUEVOS ESTADOS PARA LA BÚSQUEDA DE CÉDULA
  const [buscandoCedula, setBuscandoCedula] = useState(false)
  const [jugadorExistente, setJugadorExistente] = useState(null)

  // Consentimiento LOPDP
  const [consentimiento, setConsentimiento] = useState(false)

  // ============ ESTADOS PARA LA FOTO ============
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [previewFoto, setPreviewFoto] = useState(null)
  const [fotoActualUrl, setFotoActualUrl] = useState(null)
  const [fotoEliminada, setFotoEliminada] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Refs para los inputs de archivo
  const inputArchivoRef = useRef(null)
  const inputCamaraRef = useRef(null)

  // Calcular si es menor de edad
  const esMenor = (() => {
    if (!form.fecha_nacimiento) return false
    const hoy = new Date()
    const nacimiento = new Date(form.fecha_nacimiento)
    const edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    const edadFinal =
      mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())
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

  // Cargar datos del jugador si es edición, o resetear si es nuevo
  useEffect(() => {
    if (!abierto) return

    if (jugadorEditar) {
      const insc = jugadorEditar.inscripciones?.find((i) => i.activo)

      setForm({
        nombres: jugadorEditar.nombres || '',
        apellidos: jugadorEditar.apellidos || '',
        cedula: jugadorEditar.cedula || '',
        fecha_nacimiento: jugadorEditar.fecha_nacimiento || '',
        telefono: jugadorEditar.telefono || '',
        tipo_pase: jugadorEditar.tipo_pase || 'nuevo',
        club_anterior: jugadorEditar.club_anterior || '',
        equipo_id: insc?.equipo?.id || '',
        dorsal: insc?.dorsal || '',
        posicion: insc?.posicion || '',
        tutor_nombre: jugadorEditar.tutor_nombre || '',
        tutor_cedula: jugadorEditar.tutor_cedula || '',
        tutor_telefono: jugadorEditar.tutor_telefono || '',
      })

      if (jugadorEditar.foto_url) {
        setFotoActualUrl(jugadorEditar.foto_url)
      } else {
        setFotoActualUrl(null)
      }
    } else {
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
      setFotoActualUrl(null)
    }

    setErrores({})
    setArchivoFoto(null)
    setPreviewFoto(null)
    setFotoEliminada(false)
    setConsentimiento(jugadorEditar?.consentimiento_firmado || false)
    setJugadorExistente(null) // Resetear búsqueda al abrir
  }, [jugadorEditar, abierto])

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  // ============ BÚSQUEDA DE CÉDULA ============
  async function verificarCedula() {
    if (!form.cedula || form.cedula.length !== 10) {
      return toast.error('Ingresa una cédula válida de 10 dígitos')
    }
    
    setBuscandoCedula(true)
    try {
      const { data, error } = await supabase
        .from('jugadores')
        .select(`
          *, 
          inscripciones:jugador_equipo (
            id, activo,
            equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria)
          )
        `)
        .eq('cedula', form.cedula.trim())
        .maybeSingle()

      if (error) throw error

      if (data) {
        setJugadorExistente(data)
        // Autocompletar el formulario con los datos existentes
        setForm(prev => ({
          ...prev,
          nombres: data.nombres || '',
          apellidos: data.apellidos || '',
          fecha_nacimiento: data.fecha_nacimiento || '',
          telefono: data.telefono || '',
          tutor_nombre: data.tutor_nombre || '',
          tutor_cedula: data.tutor_cedula || '',
          tutor_telefono: data.tutor_telefono || '',
          equipo_id: '', // Limpiar el equipo para que elijan el nuevo
          dorsal: '',
          posicion: ''
        }))
        setConsentimiento(data.consentimiento_firmado || false)
        if (data.foto_url) setFotoActualUrl(data.foto_url)
        toast.success('Jugador ya registrado. Inscríbelo en un nuevo equipo.', { icon: '🔍' })
      } else {
        setJugadorExistente(null)
        toast.success('Cédula disponible. Continúa llenando los datos.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al verificar la cédula')
    } finally {
      setBuscandoCedula(false)
    }
  }

  // ============ MANEJO DE FOTO ============
  async function handleFotoSeleccionada(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const validacion = validarImagen(file, 5)
    if (!validacion.valido) {
      toast.error(validacion.error)
      e.target.value = ''
      return
    }

    setSubiendoFoto(true)
    toast.loading('Comprimiendo imagen...', { id: 'comprimir' })

    try {
      const comprimida = await comprimirImagen(file, {
        maxAncho: 800,
        maxAlto: 800,
        calidad: 0.85,
      })

      const tamanoKB = (comprimida.size / 1024).toFixed(0)
      toast.success(`Imagen lista (${tamanoKB} KB)`, { id: 'comprimir' })

      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviewFoto(ev.target.result)
      }
      reader.readAsDataURL(comprimida)

      setArchivoFoto(comprimida)
      setFotoEliminada(false)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al procesar la imagen', { id: 'comprimir' })
    } finally {
      setSubiendoFoto(false)
      e.target.value = ''
    }
  }

  function eliminarFoto() {
    setArchivoFoto(null)
    setPreviewFoto(null)
    setFotoActualUrl(null)
    setFotoEliminada(true)
    toast.success('Foto eliminada. Guarda los cambios para confirmar.')
  }

  function tomarFoto() {
    inputCamaraRef.current?.click()
  }

  function seleccionarArchivo() {
    inputArchivoRef.current?.click()
  }

  // ============ VALIDACIÓN ============
  function validar() {
    const nuevosErrores = {}

    // Si es un jugador EXISTENTE, solo validamos el equipo, dorsal y posición
    if (!jugadorExistente) {
      if (!form.nombres.trim()) nuevosErrores.nombres = 'Obligatorio'
      if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Obligatorio'
      if (!form.cedula.trim()) {
        nuevosErrores.cedula = 'Obligatorio'
      } else if (!/^\d{10}$/.test(form.cedula)) {
        nuevosErrores.cedula = 'Debe tener 10 dígitos'
      }
      if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Obligatorio'
      
      if (esMenor) {
        if (!form.tutor_nombre.trim()) nuevosErrores.tutor_nombre = 'Obligatorio para menores'
        if (!form.tutor_cedula.trim()) {
          nuevosErrores.tutor_cedula = 'Obligatorio para menores'
        } else if (!/^\d{10}$/.test(form.tutor_cedula)) {
          nuevosErrores.tutor_cedula = 'Debe tener 10 dígitos'
        }
        if (!form.tutor_telefono.trim()) nuevosErrores.tutor_telefono = 'Obligatorio para menores'
      }
      
      if (!consentimiento) {
        nuevosErrores.consentimiento = 'Debe autorizar el tratamiento de datos'
      }
    }

    if (!form.tipo_pase) nuevosErrores.tipo_pase = 'Obligatorio'
    if (esAdmin && !form.equipo_id) nuevosErrores.equipo_id = 'Obligatorio'
    if (form.tipo_pase && form.tipo_pase !== 'nuevo' && !form.club_anterior.trim()) {
      nuevosErrores.club_anterior = 'Obligatorio si no es nuevo'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // ============ GUARDAR ============
  async function guardar() {
    if (!validar()) {
      toast.error('Revisa los campos marcados')
      return
    }

    setCargando(true)

    try {
      if (jugadorEditar) {
        // ============ EDITAR (Igual que antes) ============
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
            consentimiento_firmado: consentimiento,
            consentimiento_fecha: consentimiento ? new Date().toISOString() : jugadorEditar.consentimiento_fecha,
          })
          .eq('id', jugadorEditar.id)

        if (errJugador) throw errJugador

        if (archivoFoto) {
          const url = await subirFotoJugador(archivoFoto, jugadorEditar.id)
          await supabase.from('jugadores').update({ foto_url: url, foto_actualizada: true }).eq('id', jugadorEditar.id)
          toast.success('Foto actualizada')
        } else if (fotoEliminada) {
          await eliminarFotoJugador(jugadorEditar.id)
          await supabase.from('jugadores').update({ foto_url: null, foto_actualizada: false }).eq('id', jugadorEditar.id)
          toast.success('Foto eliminada')
        }

        if (esAdmin) {
          const inscripcionActual = jugadorEditar.inscripciones?.find((i) => i.activo)
          const equipoActualId = inscripcionActual?.equipo?.id
          const equipoNuevoId = form.equipo_id

          if (equipoNuevoId && equipoNuevoId !== equipoActualId) {
            const hoy = new Date().toISOString().split('T')[0]

            if (inscripcionActual) {
              await supabase.from('jugador_equipo').update({ activo: false }).eq('id', inscripcionActual.id)
              await supabase.from('historial_clubes_jugador').update({ fecha_hasta: hoy }).eq('jugador_id', jugadorEditar.id).eq('equipo_id', equipoActualId).is('fecha_hasta', null)
            }

            const { error: errInsc } = await supabase.from('jugador_equipo').insert({
                jugador_id: jugadorEditar.id,
                equipo_id: equipoNuevoId,
                dorsal: form.dorsal ? parseInt(form.dorsal) : null,
                posicion: form.posicion.trim() || null,
                activo: true,
            })

            if (errInsc) throw errInsc

            const { data: equipoData } = await supabase.from('equipos').select('disciplina, categoria').eq('id', equipoNuevoId).single()
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
            toast.success('Jugador transferido a nuevo equipo')
          } else if (inscripcionActual) {
            await supabase.from('jugador_equipo').update({
                dorsal: form.dorsal ? parseInt(form.dorsal) : null,
                posicion: form.posicion.trim() || null,
            }).eq('id', inscripcionActual.id)
          }
        }
        toast.success('Jugador actualizado')
      } else {
        // ============ CREAR ============
        let equipoFinal = form.equipo_id
        if (esPresidente && usuario.club_id) {
          equipoFinal = usuario.club_id
        }

        if (!equipoFinal) {
          toast.error('Debe seleccionar un equipo')
          setCargando(false)
          return
        }

        // SI EL JUGADOR YA EXISTE (Misma cédula en otra disciplina)
        if (jugadorExistente) {
          // Verificar que no esté ya en ese equipo activamente
          const yaEnEquipo = jugadorExistente.inscripciones?.find(i => i.equipo?.id === equipoFinal && i.activo)
          if (yaEnEquipo) {
            toast.error('Este jugador ya está inscrito y activo en este equipo.')
            setCargando(false)
            return
          }

          // Solo inscribir en el nuevo equipo
          const { error: errInscripcion } = await supabase.from('jugador_equipo').insert({
            jugador_id: jugadorExistente.id,
            equipo_id: equipoFinal,
            dorsal: form.dorsal ? parseInt(form.dorsal) : null,
            posicion: form.posicion.trim() || null,
            activo: true,
          })

          if (errInscripcion) throw errInscripcion

          const { data: equipoData } = await supabase.from('equipos').select('disciplina, categoria').eq('id', equipoFinal).single()
          if (equipoData) {
            await supabase.from('historial_clubes_jugador').insert({
              jugador_id: jugadorExistente.id,
              equipo_id: equipoFinal,
              disciplina: equipoData.disciplina,
              categoria: equipoData.categoria,
              temporada: '2026-2027',
              fecha_desde: new Date().toISOString().split('T')[0],
              tipo_movimiento: 'nuevo',
              registrado_por: usuario.id,
            })
          }
          toast.success('Jugador inscrito en el nuevo equipo correctamente')
        } else {
          // CREAR JUGADOR NUEVO (Flujo original)
          const { data: nuevoJugador, error: errJugador } = await supabase.from('jugadores').insert({
              nombres: form.nombres.toUpperCase().trim(),
              apellidos: form.apellidos.toUpperCase().trim(),
              cedula: form.cedula.trim(),
              fecha_nacimiento: form.fecha_nacimiento,
              telefono: form.telefono.trim() || null,
              tipo_pase: form.tipo_pase,
              club_anterior: form.club_anterior.trim() || null,
              estado_pase: 'pendiente',
              calificado: false,
              foto_actualizada: false,
              tutor_nombre: esMenor ? form.tutor_nombre.toUpperCase().trim() : null,
              tutor_cedula: esMenor ? form.tutor_cedula.trim() : null,
              tutor_telefono: esMenor ? form.tutor_telefono.trim() : null,
              consentimiento_firmado: consentimiento,
              consentimiento_fecha: new Date().toISOString(),
          }).select().single()

          if (errJugador) throw errJugador

          if (archivoFoto) {
            try {
              const url = await subirFotoJugador(archivoFoto, nuevoJugador.id)
              await supabase.from('jugadores').update({ foto_url: url, foto_actualizada: true }).eq('id', nuevoJugador.id)
            } catch (errFoto) {
              console.error('Error subiendo foto:', errFoto)
              toast.error('Jugador creado pero hubo un error al subir la foto')
            }
          }

          const { error: errInscripcion } = await supabase.from('jugador_equipo').insert({
              jugador_id: nuevoJugador.id,
              equipo_id: equipoFinal,
              dorsal: form.dorsal ? parseInt(form.dorsal) : null,
              posicion: form.posicion.trim() || null,
              activo: true,
          })

          if (errInscripcion) throw errInscripcion

          const { data: equipoData } = await supabase.from('equipos').select('disciplina, categoria').eq('id', equipoFinal).single()
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
  const fotoMostrar = previewFoto || fotoActualUrl

  // Verificar si el jugador ya está en algún equipo (solo informativo)
  const equiposActuales = jugadorExistente?.inscripciones?.filter(i => i.activo) || []

  return (
    <>
      <div onClick={onCerrar} className="fixed inset-0 bg-black/40 z-40 transition-opacity" />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              {jugadorEditar ? 'Editar Jugador' : 'Agregar Jugador'}
            </h2>
            <p className="text-xs text-liga-amarillo">
              {jugadorEditar ? 'Modifica los datos' : 'Llena todos los campos obligatorios'}
            </p>
          </div>
          <button onClick={onCerrar} className="p-2 hover:bg-white/10 rounded-md transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AVISO DE JUGADOR EXISTENTE */}
          {jugadorExistente && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md mb-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-green-800">Jugador Encontrado en el Sistema</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Esta persona ya tiene una cuenta. No es necesario volver a llenar sus datos personales.
                  </p>
                  {equiposActuales.length > 0 && (
                    <div className="mt-2 text-xs text-green-700 bg-green-100/50 p-2 rounded">
                      <strong>Inscrito actualmente en:</strong>
                      <ul className="list-disc ml-4 mt-1">
                        {equiposActuales.map(insc => (
                          <li key={insc.id}>{insc.equipo?.nombre} ({insc.equipo?.disciplina} · {insc.equipo?.categoria})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-sm text-green-700 font-semibold mt-2">
                    👇 Solo selecciona el nuevo equipo abajo para inscribirlo en otra categoría.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: FOTO (Ocultar si ya existe y no es edición) */}
          {!jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
                Foto del Jugador
              </h3>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {fotoMostrar ? (
                    <img src={fotoMostrar} alt="Foto del jugador" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={40} className="text-gray-400" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button type="button" onClick={tomarFoto} disabled={subiendoFoto} className="bg-liga-azul text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center gap-2">
                    {subiendoFoto ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />} Tomar foto
                  </button>
                  <button type="button" onClick={seleccionarArchivo} disabled={subiendoFoto} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2">
                    <ImageIcon size={16} /> Seleccionar
                  </button>
                  {fotoMostrar && (
                    <button type="button" onClick={eliminarFoto} disabled={subiendoFoto} className="bg-red-100 text-liga-rojo px-3 py-2 rounded-md text-sm font-semibold hover:bg-red-200 disabled:opacity-50 flex items-center gap-2">
                      <Trash2 size={16} /> Eliminar
                    </button>
                  )}
                </div>
                <input ref={inputArchivoRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFotoSeleccionada} className="hidden" />
                <input ref={inputCamaraRef} type="file" accept="image/*" capture="user" onChange={handleFotoSeleccionada} className="hidden" />
              </div>
            </section>
          )}

          {/* SECCIÓN: Datos personales (Bloqueados si el jugador ya existe) */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Datos Personales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={form.nombres} 
                  onChange={(e) => actualizarCampo('nombres', e.target.value)} 
                  disabled={!!jugadorExistente}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.nombres ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} 
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={form.apellidos} 
                  onChange={(e) => actualizarCampo('apellidos', e.target.value)} 
                  disabled={!!jugadorExistente}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.apellidos ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} 
                />
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      actualizarCampo('cedula', val);
                      if (jugadorExistente) setJugadorExistente(null); // Si cambia la cédula, quitar el bloqueo
                    }}
                    disabled={!!jugadorExistente || !!jugadorEditar}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${errores.cedula ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente || jugadorEditar ? 'bg-gray-100 text-gray-500' : ''}`}
                    placeholder="0501234567"
                    maxLength={10}
                  />
                  {/* Botón de búsqueda (Solo para jugadores nuevos) */}
                  {!jugadorEditar && !jugadorExistente && (
                    <button 
                      type="button" 
                      onClick={verificarCedula}
                      disabled={buscandoCedula || form.cedula.length !== 10}
                      className="bg-gray-200 text-gray-700 px-3 rounded-md hover:bg-gray-300 disabled:opacity-50 flex-shrink-0 flex items-center gap-1 font-semibold text-sm"
                    >
                      {buscandoCedula ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                      Buscar
                    </button>
                  )}
                </div>
                {errores.cedula && <p className="text-xs text-red-500 mt-1">{errores.cedula}</p>}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Nacimiento <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={form.fecha_nacimiento} 
                  onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)} 
                  disabled={!!jugadorExistente}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} 
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={form.telefono} 
                  onChange={(e) => actualizarCampo('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                  disabled={!!jugadorExistente}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} 
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Tutor (Solo si es menor y no está bloqueado) */}
          {esMenor && !jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Datos del Tutor</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Tutor <span className="text-red-500">*</span></label>
                  <input type="text" value={form.tutor_nombre} onChange={(e) => actualizarCampo('tutor_nombre', e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.tutor_nombre ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula del Tutor <span className="text-red-500">*</span></label>
                    <input type="text" value={form.tutor_cedula} onChange={(e) => actualizarCampo('tutor_cedula', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${errores.tutor_cedula ? 'border-red-500' : 'border-gray-300'}`} maxLength={10} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono del Tutor <span className="text-red-500">*</span></label>
                    <input type="text" value={form.tutor_telefono} onChange={(e) => actualizarCampo('tutor_telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.tutor_telefono ? 'border-red-500' : 'border-gray-300'}`} maxLength={10} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECCIÓN: Consentimiento (Ocultar si ya existe) */}
          {!jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Consentimiento de Datos (LOPDP)</h3>
              <div className={`p-4 rounded-lg border-2 ${errores.consentimiento ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentimiento} onChange={(e) => { setConsentimiento(e.target.checked); setErrores(prev => ({ ...prev, consentimiento: null })) }} className="mt-1 w-5 h-5 text-liga-azul rounded focus:ring-liga-azul flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800 mb-1">{esMenor ? 'Autorización del Tutor Legal' : 'Autorización del Jugador'}</p>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      {esMenor ? 'Declaro ser el tutor legal del jugador y AUTORIZO...' : 'AUTORIZO a la Liga Deportiva...'}
                    </p>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* SECCIÓN: Datos deportivos (SIEMPRE VISIBLE) */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              {jugadorExistente ? 'Nueva Inscripción de Equipo' : 'Datos Deportivos'}
            </h3>

            {esAdmin && (
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Equipo <span className="text-red-500">*</span></label>
                <select value={form.equipo_id} onChange={(e) => actualizarCampo('equipo_id', e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.equipo_id ? 'border-red-500' : 'border-gray-300'}`}>
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.disciplina} · {eq.categoria})</option>
                  ))}
                </select>
                {errores.equipo_id && <p className="text-xs text-red-500 mt-1">{errores.equipo_id}</p>}
              </div>
            )}

            {esPresidente && equipoDelPresidente && (
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Equipo</label>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  <strong>{equipoDelPresidente.nombre}</strong>
                  <div className="text-xs text-blue-600">{equipoDelPresidente.disciplina} · {equipoDelPresidente.categoria}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dorsal</label>
                <input type="number" value={form.dorsal} onChange={(e) => actualizarCampo('dorsal', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul" placeholder="10" min="1" max="99" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Posición</label>
                <select value={form.posicion} onChange={(e) => actualizarCampo('posicion', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul">
                  <option value="">Seleccionar</option>
                  <option value="Portero">Portero</option>
                  <option value="Defensa">Defensa</option>
                  <option value="Mediocampista">Mediocampista</option>
                  <option value="Delantero">Delantero</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Pase deportivo (Ocultar si ya existe) */}
          {!jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Pase Deportivo</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Pase <span className="text-red-500">*</span></label>
                  <select value={form.tipo_pase} onChange={(e) => actualizarCampo('tipo_pase', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul">
                    <option value="nuevo">Nuevo (primera inscripción)</option>
                    <option value="club_club">Viene de otro club (misma liga)</option>
                    <option value="liga_liga">Viene de otra liga</option>
                    <option value="canton">Viene de otro cantón</option>
                    <option value="provincia">Viene de otra provincia</option>
                  </select>
                </div>
                {form.tipo_pase !== 'nuevo' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Club Anterior <span className="text-red-500">*</span></label>
                    <input type="text" value={form.club_anterior} onChange={(e) => actualizarCampo('club_anterior', e.target.value)} className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${errores.club_anterior ? 'border-red-500' : 'border-gray-300'}`} />
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button onClick={onCerrar} disabled={cargando || subiendoFoto} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={guardar} disabled={cargando || subiendoFoto} className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {cargando ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Guardando...</>
            ) : (
              <><Save size={16} />{jugadorExistente ? 'Inscribir en Equipo' : jugadorEditar ? 'Guardar cambios' : 'Agregar jugador'}</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}