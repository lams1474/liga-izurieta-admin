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
    nombres: '', apellidos: '', cedula: '', fecha_nacimiento: '', telefono: '',
    tipo_pase: 'nuevo', club_anterior: '', equipo_id: '', dorsal: '', posicion: '',
    tutor_nombre: '', tutor_cedula: '', tutor_telefono: '',
  })

  const [errores, setErrores] = useState({})
  const [buscandoCedula, setBuscandoCedula] = useState(false)
  const [jugadorExistente, setJugadorExistente] = useState(null)
  const [consentimiento, setConsentimiento] = useState(false)

  const [archivoFoto, setArchivoFoto] = useState(null)
  const [previewFoto, setPreviewFoto] = useState(null)
  const [fotoActualUrl, setFotoActualUrl] = useState(null)
  const [fotoEliminada, setFotoEliminada] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const inputArchivoRef = useRef(null)
  const inputCamaraRef = useRef(null)

  const esMenor = (() => {
    if (!form.fecha_nacimiento) return false
    const hoy = new Date()
    const nacimiento = new Date(form.fecha_nacimiento)
    const edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    return (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate()) ? edad - 1 : edad) < 18
  })()

  // Cargar equipos (Admin y Presidente)
  useEffect(() => {
    async function cargarEquipos() {
      if (!esAdmin && !esPresidente) return

      const { data } = await supabase.from('equipos').select('id, nombre, disciplina, categoria').eq('activo', true).order('nombre')

      let equiposFiltrados = data || []

      if (esPresidente && usuario) {
        const miEquipo = data?.find(eq => eq.id === usuario.club_id || eq.id === usuario.equipo_id)
        if (miEquipo) {
          equiposFiltrados = data.filter(eq => eq.nombre === miEquipo.nombre)
        }
      }

      setEquipos(equiposFiltrados)
    }
    cargarEquipos()
  }, [esAdmin, esPresidente, usuario])

  useEffect(() => {
    if (!abierto) return
    if (jugadorEditar) {
      setForm({
        nombres: jugadorEditar.nombres || '', apellidos: jugadorEditar.apellidos || '', cedula: jugadorEditar.cedula || '',
        fecha_nacimiento: jugadorEditar.fecha_nacimiento || '', telefono: jugadorEditar.telefono || '',
        tipo_pase: jugadorEditar.tipo_pase || 'nuevo', club_anterior: jugadorEditar.club_anterior || '',
        equipo_id: '', dorsal: '', posicion: '',
        tutor_nombre: jugadorEditar.tutor_nombre || '', tutor_cedula: jugadorEditar.tutor_cedula || '', tutor_telefono: jugadorEditar.tutor_telefono || '',
      })
      setFotoActualUrl(jugadorEditar.foto_url || null)
    } else {
      setForm({ nombres: '', apellidos: '', cedula: '', fecha_nacimiento: '', telefono: '', tipo_pase: 'nuevo', club_anterior: '', equipo_id: '', dorsal: '', posicion: '', tutor_nombre: '', tutor_cedula: '', tutor_telefono: '' })
      setFotoActualUrl(null)
    }
    setErrores({})
    setArchivoFoto(null)
    setPreviewFoto(null)
    setFotoEliminada(false)
    setConsentimiento(jugadorEditar?.consentimiento_firmado || false)
    setJugadorExistente(null)
  }, [jugadorEditar, abierto])

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  async function verificarCedula() {
    if (!form.cedula || form.cedula.length !== 10) return toast.error('Ingresa una cédula válida')
    setBuscandoCedula(true)
    try {
      const { data, error } = await supabase.from('jugadores').select(`
          *, inscripciones:jugador_equipo (id, activo, equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria))
        `).eq('cedula', form.cedula.trim()).maybeSingle()

      if (error) throw error

      if (data) {
        setJugadorExistente(data)
        setForm(prev => ({
          ...prev, nombres: data.nombres || '', apellidos: data.apellidos || '', fecha_nacimiento: data.fecha_nacimiento || '',
          telefono: data.telefono || '', tutor_nombre: data.tutor_nombre || '', tutor_cedula: data.tutor_cedula || '', tutor_telefono: data.tutor_telefono || '',
          equipo_id: '', dorsal: '', posicion: ''
        }))
        setConsentimiento(data.consentimiento_firmado || false)
        if (data.foto_url) setFotoActualUrl(data.foto_url)
        toast.success('Jugador ya registrado. Selecciona un equipo nuevo para inscribirlo.', { icon: '🔍' })
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

  async function handleFotoSeleccionada(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const validacion = validarImagen(file, 5)
    if (!validacion.valido) { toast.error(validacion.error); e.target.value = ''; return }

    setSubiendoFoto(true)
    toast.loading('Comprimiendo imagen...', { id: 'comprimir' })
    try {
      const comprimida = await comprimirImagen(file, { maxAncho: 800, maxAlto: 800, calidad: 0.85 })
      toast.success(`Imagen lista (${(comprimida.size / 1024).toFixed(0)} KB)`, { id: 'comprimir' })
      const reader = new FileReader()
      reader.onload = (ev) => setPreviewFoto(ev.target.result)
      reader.readAsDataURL(comprimida)
      setArchivoFoto(comprimida)
      setFotoEliminada(false)
    } catch (err) {
      console.error(err)
      toast.error('Error al procesar la imagen', { id: 'comprimir' })
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
  }

  function validar() {
    const nuevosErrores = {}
    if (!jugadorExistente) {
      if (!form.nombres.trim()) nuevosErrores.nombres = 'Obligatorio'
      if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Obligatorio'
      if (!form.cedula.trim()) nuevosErrores.cedula = 'Obligatorio'
      else if (!/^\d{10}$/.test(form.cedula)) nuevosErrores.cedula = 'Debe tener 10 dígitos'
      if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Obligatorio'
      if (esMenor) {
        if (!form.tutor_nombre.trim()) nuevosErrores.tutor_nombre = 'Obligatorio'
        if (!form.tutor_cedula.trim()) nuevosErrores.tutor_cedula = 'Obligatorio'
        if (!form.tutor_telefono.trim()) nuevosErrores.tutor_telefono = 'Obligatorio'
      }
      if (!consentimiento) nuevosErrores.consentimiento = 'Debe autorizar el tratamiento'
    }

    if (!jugadorEditar && (esAdmin || esPresidente) && !form.equipo_id) {
      nuevosErrores.equipo_id = 'Obligatorio'
    }

    if (form.tipo_pase && form.tipo_pase !== 'nuevo' && !form.club_anterior.trim()) nuevosErrores.club_anterior = 'Obligatorio'

    if (!jugadorEditar && (esAdmin || esPresidente) && !form.equipo_id) {
      nuevosErrores.equipo_id = 'Obligatorio'
    }

    if (form.tipo_pase && form.tipo_pase !== 'nuevo' && !form.club_anterior.trim()) nuevosErrores.club_anterior = 'Obligatorio'

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function guardar() {
    if (!validar()) return toast.error('Revisa los campos marcados')
    setCargando(true)

    try {
      if (jugadorEditar) {
        const { error: errJugador } = await supabase.from('jugadores').update({
            nombres: form.nombres.toUpperCase().trim(), apellidos: form.apellidos.toUpperCase().trim(), cedula: form.cedula.trim(),
            fecha_nacimiento: form.fecha_nacimiento, telefono: form.telefono.trim() || null, tipo_pase: form.tipo_pase,
            club_anterior: form.club_anterior.trim() || null, tutor_nombre: esMenor ? form.tutor_nombre.toUpperCase().trim() : null,
            tutor_cedula: esMenor ? form.tutor_cedula.trim() : null, tutor_telefono: esMenor ? form.tutor_telefono.trim() : null,
            consentimiento_firmado: consentimiento, consentimiento_fecha: consentimiento ? new Date().toISOString() : jugadorEditar.consentimiento_fecha,
        }).eq('id', jugadorEditar.id)
        if (errJugador) throw errJugador

        if (archivoFoto) {
          const url = await subirFotoJugador(archivoFoto, jugadorEditar.id)
          await supabase.from('jugadores').update({ foto_url: url, foto_actualizada: true }).eq('id', jugadorEditar.id)
        } else if (fotoEliminada) {
          await eliminarFotoJugador(jugadorEditar.id)
          await supabase.from('jugadores').update({ foto_url: null, foto_actualizada: false }).eq('id', jugadorEditar.id)
        }
        toast.success('Datos personales actualizados')
      } else {
        let equipoFinal = form.equipo_id
        if (!equipoFinal) throw new Error('Debe seleccionar un equipo')

        if (jugadorExistente) {
          const yaEnEquipo = jugadorExistente.inscripciones?.find(i => i.equipo?.id === equipoFinal && i.activo)
          if (yaEnEquipo) {
            throw new Error('El jugador YA está inscrito en este equipo en esta disciplina. Selecciona una categoría o disciplina diferente.')
          }

          const { error: errInscripcion } = await supabase.from('jugador_equipo').insert({
            jugador_id: jugadorExistente.id, equipo_id: equipoFinal, dorsal: form.dorsal ? parseInt(form.dorsal) : null, posicion: form.posicion.trim() || null, activo: true,
          })
          if (errInscripcion) throw errInscripcion

          const { data: equipoData } = await supabase.from('equipos').select('disciplina, categoria').eq('id', equipoFinal).single()
          if (equipoData) {
            await supabase.from('historial_clubes_jugador').insert({
              jugador_id: jugadorExistente.id, equipo_id: equipoFinal, disciplina: equipoData.disciplina, categoria: equipoData.categoria, temporada: '2026-2027', fecha_desde: new Date().toISOString().split('T')[0], tipo_movimiento: 'nuevo', registrado_por: usuario.id,
            })
          }
          toast.success('Jugador sumado a la nueva nómina correctamente')
        } else {
          const { data: nuevoJugador, error: errJugador } = await supabase.from('jugadores').insert({
              nombres: form.nombres.toUpperCase().trim(), apellidos: form.apellidos.toUpperCase().trim(), cedula: form.cedula.trim(),
              fecha_nacimiento: form.fecha_nacimiento, telefono: form.telefono.trim() || null, tipo_pase: form.tipo_pase,
              club_anterior: form.club_anterior.trim() || null, estado_pase: 'pendiente', calificado: false, foto_actualizada: false,
              tutor_nombre: esMenor ? form.tutor_nombre.toUpperCase().trim() : null, tutor_cedula: esMenor ? form.tutor_cedula.trim() : null,
              tutor_telefono: esMenor ? form.tutor_telefono.trim() : null, consentimiento_firmado: consentimiento, consentimiento_fecha: new Date().toISOString(),
          }).select().single()
          if (errJugador) throw errJugador

          if (archivoFoto) {
            try {
              const url = await subirFotoJugador(archivoFoto, nuevoJugador.id)
              await supabase.from('jugadores').update({ foto_url: url, foto_actualizada: true }).eq('id', nuevoJugador.id)
            } catch (err) { console.error(err) }
          }

          const { error: errInscripcion } = await supabase.from('jugador_equipo').insert({
              jugador_id: nuevoJugador.id, equipo_id: equipoFinal, dorsal: form.dorsal ? parseInt(form.dorsal) : null, posicion: form.posicion.trim() || null, activo: true,
          })
          if (errInscripcion) throw errInscripcion

          const { data: equipoData } = await supabase.from('equipos').select('disciplina, categoria').eq('id', equipoFinal).single()
          if (equipoData) {
            await supabase.from('historial_clubes_jugador').insert({
              jugador_id: nuevoJugador.id, equipo_id: equipoFinal, disciplina: equipoData.disciplina, categoria: equipoData.categoria, temporada: '2026-2027', fecha_desde: new Date().toISOString().split('T')[0], tipo_movimiento: form.tipo_pase === 'nuevo' ? 'nuevo' : 'pase_entrada', registrado_por: usuario.id,
            })
          }
          toast.success('Jugador registrado y agregado al equipo')
        }
      }
      onGuardado?.()
      onCerrar?.()
    } catch (err) {
      console.error(err)
      if (err.message?.includes('duplicate') || err.message?.includes('uq_jugador_equipo')) {
        toast.error('El jugador ya está en este equipo. Intenta con otro equipo de diferente disciplina.')
      } else {
        toast.error(err.message || 'Error al guardar')
      }
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null
  const fotoMostrar = previewFoto || fotoActualUrl
  const equiposActuales = jugadorExistente?.inscripciones?.filter(i => i.activo) || []

  return (
    <>
      <div onClick={onCerrar} className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">{jugadorEditar ? 'Editar Datos Personales' : 'Agregar Jugador / Inscribir'}</h2>
            <p className="text-xs text-liga-amarillo">{jugadorEditar ? 'Modifica solo los datos del jugador' : 'Llena los datos o busca por cédula'}</p>
          </div>
          <button onClick={onCerrar} className="p-2 hover:bg-white/10 rounded-md transition-colors"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-6">
          {jugadorExistente && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md mb-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-bold text-green-800">Jugador Encontrado</h4>
                  <p className="text-sm text-green-700 mt-1">Esta persona ya tiene cuenta. Selecciona el nuevo equipo/disciplina para sumarlo a la nómina.</p>
                  {equiposActuales.length > 0 && (
                    <div className="mt-2 text-xs text-green-700 bg-green-100/50 p-2 rounded">
                      <strong>Inscrito actualmente en:</strong>
                      <ul className="list-disc ml-4 mt-1">
                        {equiposActuales.map(insc => <li key={insc.id}>{insc.equipo?.nombre} ({insc.equipo?.disciplina} · {insc.equipo?.categoria})</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Foto del Jugador</h3>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                  {fotoMostrar ? <img src={fotoMostrar} className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-gray-400" />}
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button type="button" onClick={() => inputCamaraRef.current?.click()} disabled={subiendoFoto} className="bg-liga-azul text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
                    {subiendoFoto ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />} Tomar foto
                  </button>
                  <button type="button" onClick={() => inputArchivoRef.current?.click()} disabled={subiendoFoto} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-semibold hover:bg-gray-200 flex items-center gap-2">
                    <ImageIcon size={16} /> Seleccionar
                  </button>
                  {fotoMostrar && (
                    <button type="button" onClick={eliminarFoto} disabled={subiendoFoto} className="bg-red-100 text-liga-rojo px-3 py-2 rounded-md text-sm font-semibold hover:bg-red-200 flex items-center gap-2"><Trash2 size={16} /> Eliminar</button>
                  )}
                </div>
                <input ref={inputArchivoRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleFotoSeleccionada} className="hidden" />
                <input ref={inputCamaraRef} type="file" accept="image/*" capture="user" onChange={handleFotoSeleccionada} className="hidden" />
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Datos Personales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres *</label>
                <input type="text" value={form.nombres} onChange={(e) => actualizarCampo('nombres', e.target.value)} disabled={!!jugadorExistente} className={`w-full px-3 py-2 border rounded-md ${errores.nombres ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos *</label>
                <input type="text" value={form.apellidos} onChange={(e) => actualizarCampo('apellidos', e.target.value)} disabled={!!jugadorExistente} className={`w-full px-3 py-2 border rounded-md ${errores.apellidos ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula *</label>
                <div className="flex gap-2">
                  {/* AQUI SE QUITO EL BLOQUEO PARA PERMITIR EDITAR LA CEDULA */}
                  <input type="text" value={form.cedula} onChange={(e) => { actualizarCampo('cedula', e.target.value.replace(/\D/g, '').slice(0, 10)); if (jugadorExistente) setJugadorExistente(null); }} disabled={!!jugadorExistente} className={`w-full px-3 py-2 border rounded-md font-mono ${errores.cedula ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} maxLength={10} />
                  {!jugadorEditar && !jugadorExistente && (
                    <button type="button" onClick={verificarCedula} disabled={buscandoCedula || form.cedula.length !== 10} className="bg-gray-200 text-gray-700 px-3 rounded-md hover:bg-gray-300 disabled:opacity-50 flex-shrink-0 flex items-center gap-1 font-semibold text-sm">
                      {buscandoCedula ? <Loader size={16} className="animate-spin" /> : <Search size={16} />} Buscar
                    </button>
                  )}
                </div>
                {errores.cedula && <p className="text-xs text-red-500 mt-1">{errores.cedula}</p>}
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Nac. *</label>
                <input type="date" value={form.fecha_nacimiento} onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)} disabled={!!jugadorExistente} className={`w-full px-3 py-2 border rounded-md ${errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'} ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} disabled={!!jugadorExistente} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${jugadorExistente ? 'bg-gray-100 text-gray-500' : ''}`} />
              </div>
            </div>
          </section>

          {esMenor && !jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Datos del Tutor</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Tutor *</label>
                  <input type="text" value={form.tutor_nombre} onChange={(e) => actualizarCampo('tutor_nombre', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${errores.tutor_nombre ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula del Tutor *</label>
                    <input type="text" value={form.tutor_cedula} onChange={(e) => actualizarCampo('tutor_cedula', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-3 py-2 border rounded-md font-mono ${errores.tutor_cedula ? 'border-red-500' : 'border-gray-300'}`} maxLength={10} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono del Tutor *</label>
                    <input type="text" value={form.tutor_telefono} onChange={(e) => actualizarCampo('tutor_telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full px-3 py-2 border rounded-md ${errores.tutor_telefono ? 'border-red-500' : 'border-gray-300'}`} maxLength={10} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TEXTO LOPDP EXACTO Y COMPLETO */}
          {!jugadorExistente && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Consentimiento de Datos (LOPDP)</h3>
              <div className={`p-4 rounded-lg border-2 ${errores.consentimiento ? 'border-red-300 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={consentimiento} onChange={(e) => { setConsentimiento(e.target.checked); setErrores(prev => ({ ...prev, consentimiento: null })) }} className="mt-1 w-5 h-5 text-liga-azul rounded focus:ring-liga-azul flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800 mb-1">
                      {esMenor ? 'Autorización del Tutor Legal' : 'Autorización del Jugador'}
                    </p>
                    <p className="text-gray-600 text-xs leading-relaxed">
                      {esMenor
                        ? 'Declaro ser el tutor legal del jugador y AUTORIZO a la Liga Deportiva Barrial José Ignacio Izurieta a recopilar, almacenar y tratar los datos personales del menor (nombres, cédula, fecha de nacimiento, fotografía) con la finalidad exclusiva de gestionar su participación en el campeonato, cumpliendo con la Ley Orgánica de Protección de Datos Personales.'
                        : 'AUTORIZO a la Liga Deportiva Barrial José Ignacio Izurieta a recopilar, almacenar y tratar mis datos personales (nombres, cédula, fecha de nacimiento, fotografía) con la finalidad exclusiva de gestionar mi participación en el campeonato, cumpliendo con la Ley Orgánica de Protección de Datos Personales.'}
                    </p>
                  </div>
                </label>
                {errores.consentimiento && <p className="text-xs text-red-500 mt-2 font-semibold">⚠️ {errores.consentimiento}</p>}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              {jugadorExistente ? 'Inscribir en Nuevo Equipo' : jugadorEditar ? 'Inscripciones Actuales (Solo lectura)' : 'Datos Deportivos'}
            </h3>

            {jugadorEditar ? (
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                <p className="text-gray-500 mb-2">Este jugador pertenece a las siguientes nóminas:</p>
                {jugadorEditar.inscripciones?.filter(i => i.activo).map(insc => (
                  <div key={insc.id} className="mb-1 text-gray-800 font-semibold">• {insc.equipo?.nombre} ({insc.equipo?.disciplina} · {insc.equipo?.categoria})</div>
                ))}
                <p className="text-xs text-blue-600 mt-2">Si deseas sumarlo a otra categoría, ciérralo y usa el botón "Agregar Jugador" buscando su cédula.</p>
              </div>
            ) : (
              <>
                {(esAdmin || esPresidente) && (
                  <div className="mb-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Equipo / Disciplina *</label>
                    <select value={form.equipo_id} onChange={(e) => actualizarCampo('equipo_id', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${errores.equipo_id ? 'border-red-500' : 'border-gray-300'}`}>
                      <option value="">Seleccionar equipo</option>
                      {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.disciplina} · {eq.categoria})</option>)}
                    </select>
                    {errores.equipo_id && <p className="text-xs text-red-500 mt-1">{errores.equipo_id}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dorsal</label>
                    <input type="number" value={form.dorsal} onChange={(e) => actualizarCampo('dorsal', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="10" min="1" max="99" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Posición</label>
                    <select value={form.posicion} onChange={(e) => actualizarCampo('posicion', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="">Seleccionar</option>
                      <option value="Portero">Portero</option>
                      <option value="Defensa">Defensa</option>
                      <option value="Mediocampista">Mediocampista</option>
                      <option value="Delantero">Delantero</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <button onClick={onCerrar} disabled={cargando || subiendoFoto} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={cargando || subiendoFoto} className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center justify-center gap-2">
            {cargando ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Guardando...</> : <><Save size={16} />{jugadorExistente ? 'Inscribir en Equipo' : jugadorEditar ? 'Guardar Datos' : 'Agregar jugador'}</>}
          </button>
        </div>
      </div>
    </>
  )
}