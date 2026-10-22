/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ShieldAlert, DollarSign, CheckCircle, Trash2, Search, Plus, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Sanciones() {
  const { usuario } = useAuth()
  const [vista, setVista] = useState('sanciones_jugador') // 'sanciones_jugador' | 'sanciones_equipo' | 'deudas'
  
  const [sancionesJugadores, setSancionesJugadores] = useState([])
  const [sancionesEquipos, setSancionesEquipos] = useState([])
  const [deudas, setDeudas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // === ESTADOS PARA CREAR SANCIONES ===
  const [modalSancionJugador, setModalSancionJugador] = useState(false)
  const [nuevaSancionJugador, setNuevaSancionJugador] = useState({ cedula: '', jugador: null, motivo: '', tipo: 'roja_directa', fechas_sancion: 1 })
  
  const [modalSancionEquipo, setModalSancionEquipo] = useState(false)
  const [nuevaSancionEquipo, setNuevaSancionEquipo] = useState({ equipo_id: '', motivo: '', tipo: 'multa_economica', fechas_sancion: 0, descripcion: '', monto: '' })
  
  const [equipos, setEquipos] = useState([])
  const [registrando, setRegistrando] = useState(false)

  async function cargarDatos() {
    setCargando(true)
    try {
      // 1. Cargar sanciones de jugadores
      const { data: sj } = await supabase
        .from('sanciones_jugador')
        .select(`
          id, tipo, motivo, fechas_sancion, fechas_cumplidas, fecha_inicio, activa,
          jugador:jugadores!sanciones_jugador_jugador_id_fkey (id, apellidos, nombres, cedula),
          equipo:equipos!sanciones_jugador_equipo_id_fkey (nombre)
        `)
        .eq('activa', true)
        .order('creado_en', { ascending: false })

      // 2. Cargar sanciones de equipos
      const { data: se } = await supabase
        .from('sanciones_equipo')
        .select(`
          id, motivo, tipo, descripcion, monto, fechas_sancion, activa,
          equipo:equipos!sanciones_equipo_equipo_id_fkey (id, nombre)
        `)
        .eq('activa', true)
        .order('creado_en', { ascending: false })

      // 3. Cargar deudas pendientes
      const { data: d } = await supabase
        .from('deudas_jugador')
        .select(`
          id, concepto, monto, monto_pagado, fecha_emision,
          jugador:jugadores!deudas_jugador_jugador_id_fkey (id, apellidos, nombres, cedula),
          equipo:equipos!deudas_jugador_equipo_id_fkey (nombre)
        `)
        .order('creado_en', { ascending: false })

      // 4. Cargar lista de equipos para el selector
      const { data: eq } = await supabase.from('equipos').select('id, nombre').order('nombre')

      setSancionesJugadores(sj || [])
      setSancionesEquipos(se || [])
      setDeudas((d || []).filter(item => item.monto_pagado < item.monto))
      setEquipos(eq || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // === BUSCAR JUGADOR PARA SANCIONAR ===
  async function buscarJugadorSancion() {
    if (!nuevaSancionJugador.cedula.trim()) return toast.error('Ingresa una cédula')
    
    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        id, nombres, apellidos, cedula,
        inscripciones:jugador_equipo (activo, equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre))
      `)
      .eq('cedula', nuevaSancionJugador.cedula.trim())
      .eq('activo', true)
      .single()

    if (error || !data) return toast.error('Jugador no encontrado o inactivo')
    
    const equipoActivo = data.inscripciones?.find(i => i.activo)?.equipo
    if (!equipoActivo) return toast.error('El jugador no tiene equipo activo')

    setNuevaSancionJugador(prev => ({ ...prev, jugador: data, equipo_id: equipoActivo.id }))
    toast.success('Jugador encontrado')
  }

  // === CREAR SANCIONES ===
  async function crearSancionJugador(e) {
    e.preventDefault()
    if (!nuevaSancionJugador.jugador) return toast.error('Busca un jugador primero')
    setRegistrando(true)
    try {
      const { error } = await supabase.from('sanciones_jugador').insert({
        jugador_id: nuevaSancionJugador.jugador.id,
        equipo_id: nuevaSancionJugador.equipo_id,
        tipo: nuevaSancionJugador.tipo,
        motivo: nuevaSancionJugador.motivo,
        fechas_sancion: parseInt(nuevaSancionJugador.fechas_sancion) || 0,
        fechas_cumplidas: 0,
        activa: true,
        registrado_por: usuario.id,
        fecha_inicio: new Date().toISOString()
      })
      if (error) throw error
      
      toast.success('Sanción a jugador registrada')
      setModalSancionJugador(false)
      setNuevaSancionJugador({ cedula: '', jugador: null, motivo: '', tipo: 'roja_directa', fechas_sancion: 1 })
      cargarDatos()
    } catch (err) {
      toast.error('Error al crear sanción: ' + err.message)
    } finally {
      setRegistrando(false)
    }
  }

  async function crearSancionEquipo(e) {
    e.preventDefault()
    setRegistrando(true)
    try {
      const { error } = await supabase.from('sanciones_equipo').insert({
        equipo_id: nuevaSancionEquipo.equipo_id,
        motivo: nuevaSancionEquipo.motivo,
        tipo: nuevaSancionEquipo.tipo,
        descripcion: nuevaSancionEquipo.descripcion,
        monto: nuevaSancionEquipo.monto ? parseFloat(nuevaSancionEquipo.monto) : null,
        fechas_sancion: parseInt(nuevaSancionEquipo.fechas_sancion) || 0,
        activa: true,
        registrado_por: usuario.id
      })
      if (error) throw error
      
      toast.success('Sanción a equipo registrada')
      setModalSancionEquipo(false)
      setNuevaSancionEquipo({ equipo_id: '', motivo: '', tipo: 'multa_economica', fechas_sancion: 0, descripcion: '', monto: '' })
      cargarDatos()
    } catch (err) {
      toast.error('Error al crear sanción: ' + err.message)
    } finally {
      setRegistrando(false)
    }
  }

  // === ACCIONES ===
  async function eliminarSancionJugador(id) {
    if (!window.confirm('¿Eliminar esta sanción permanentemente?')) return
    const { error } = await supabase.from('sanciones_jugador').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Sanción eliminada')
    cargarDatos()
  }

  async function eliminarSancionEquipo(id) {
    if (!window.confirm('¿Eliminar esta sanción de equipo permanentemente?')) return
    const { error } = await supabase.from('sanciones_equipo').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Sanción eliminada')
    cargarDatos()
  }

  async function marcarCumplidaJugador(id, fechasSancion) {
    const { error } = await supabase.from('sanciones_jugador').update({
      fechas_cumplidas: fechasSancion,
      activa: false
    }).eq('id', id)
    if (error) return toast.error('Error al actualizar')
    toast.success('Sanción marcada como cumplida')
    cargarDatos()
  }

  async function eliminarDeuda(id) {
    if (!window.confirm('¿Eliminar esta deuda permanentemente?')) return
    const { error } = await supabase.from('deudas_jugador').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Deuda eliminada')
    cargarDatos()
  }

  async function marcarPagada(id, monto) {
    const { error } = await supabase.from('deudas_jugador').update({ monto_pagado: monto }).eq('id', id)
    if (error) return toast.error('Error al actualizar')
    toast.success('Deuda marcada como pagada')
    cargarDatos()
  }

  // Filtros
  const sjFiltradas = sancionesJugadores.filter(s => {
    const texto = busqueda.toLowerCase()
    return s.jugador?.apellidos.toLowerCase().includes(texto) || s.jugador?.nombres.toLowerCase().includes(texto) || s.jugador?.cedula.includes(texto)
  })

  const seFiltradas = sancionesEquipos.filter(s => {
    return s.equipo?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  })

  const deudasFiltradas = deudas.filter(d => {
    const texto = busqueda.toLowerCase()
    return d.jugador?.apellidos.toLowerCase().includes(texto) || d.jugador?.nombres.toLowerCase().includes(texto) || d.jugador?.cedula.includes(texto)
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Gestión de Sanciones y Deudas</h1>
          <p className="text-gray-500 text-sm mt-1">Administra las suspensiones y multas</p>
        </div>
        {/* BOTÓN DINÁMICO DE CREACIÓN */}
        {vista === 'sanciones_jugador' && (
          <button onClick={() => setModalSancionJugador(true)} className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
            <Plus size={18} /> Sancionar Jugador
          </button>
        )}
        {vista === 'sanciones_equipo' && (
          <button onClick={() => setModalSancionEquipo(true)} className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
            <Plus size={18} /> Sancionar Equipo
          </button>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setVista('sanciones_jugador')} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${vista === 'sanciones_jugador' ? 'bg-liga-azul text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <User size={20} /> Sanciones Jugador
        </button>
        <button onClick={() => setVista('sanciones_equipo')} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${vista === 'sanciones_equipo' ? 'bg-liga-azul text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <Shield size={20} /> Sanciones Equipo
        </button>
        <button onClick={() => setVista('deudas')} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${vista === 'deudas' ? 'bg-liga-azul text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <DollarSign size={20} /> Deudas (Multas)
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul" />
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-500">Cargando datos...</div>
      ) : (
        <>
          {/* VISTA SANCIONES JUGADORES */}
          {vista === 'sanciones_jugador' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {sjFiltradas.length === 0 ? (
                <div className="p-12 text-center text-gray-500"><ShieldAlert size={48} className="mx-auto text-gray-300 mb-2" />No hay sanciones activas de jugadores.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sjFiltradas.map(s => (
                    <div key={s.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{s.jugador?.apellidos} {s.jugador?.nombres}</p>
                        <p className="text-sm text-gray-500">{s.equipo?.nombre} | C.C. {s.jugador?.cedula}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold capitalize">{s.tipo.replace('_', ' ')}</span>
                          <span className="text-xs font-semibold text-gray-600">{s.motivo}</span>
                          <span className="text-xs font-bold text-liga-azul">(Faltan {s.fechas_sancion - s.fechas_cumplidas} fechas)</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => marcarCumplidaJugador(s.id, s.fechas_sancion)} className="flex-1 sm:flex-none bg-green-100 text-green-700 px-3 py-2 rounded-md font-semibold hover:bg-green-200 flex items-center justify-center gap-1 text-sm"><CheckCircle size={16} /> Cumplir</button>
                        <button onClick={() => eliminarSancionJugador(s.id)} className="flex-1 sm:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-md font-semibold hover:bg-red-200 flex items-center justify-center gap-1 text-sm"><Trash2 size={16} /> Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISTA SANCIONES EQUIPOS */}
          {vista === 'sanciones_equipo' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {seFiltradas.length === 0 ? (
                <div className="p-12 text-center text-gray-500"><Shield size={48} className="mx-auto text-gray-300 mb-2" />No hay sanciones activas de equipos.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {seFiltradas.map(s => (
                    <div key={s.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{s.equipo?.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold capitalize">{s.tipo.replace('_', ' ')}</span>
                          <span className="text-xs font-semibold text-gray-600">{s.motivo}</span>
                          {s.monto && <span className="text-xs font-bold text-red-600">Multa: ${s.monto}</span>}
                          {s.fechas_sancion > 0 && <span className="text-xs font-bold text-liga-azul">Suspensión: {s.fechas_sancion} fechas</span>}
                        </div>
                        {s.descripcion && <p className="text-xs text-gray-500 mt-1">{s.descripcion}</p>}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => eliminarSancionEquipo(s.id)} className="flex-1 sm:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-md font-semibold hover:bg-red-200 flex items-center justify-center gap-1 text-sm"><Trash2 size={16} /> Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISTA DEUDAS */}
          {vista === 'deudas' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {deudasFiltradas.length === 0 ? (
                <div className="p-12 text-center text-gray-500"><DollarSign size={48} className="mx-auto text-gray-300 mb-2" />No hay deudas pendientes registradas.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {deudasFiltradas.map(d => (
                    <div key={d.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{d.jugador?.apellidos} {d.jugador?.nombres}</p>
                        <p className="text-sm text-gray-500">{d.equipo?.nombre} | C.C. {d.jugador?.cedula}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold">{d.concepto}</span>
                          <span className="text-xs font-bold text-liga-rojo">Saldo: ${(d.monto - d.monto_pagado).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => marcarPagada(d.id, d.monto)} className="flex-1 sm:flex-none bg-green-100 text-green-700 px-3 py-2 rounded-md font-semibold hover:bg-green-200 flex items-center justify-center gap-1 text-sm"><CheckCircle size={16} /> Pagar</button>
                        <button onClick={() => eliminarDeuda(d.id)} className="flex-1 sm:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-md font-semibold hover:bg-red-200 flex items-center justify-center gap-1 text-sm"><Trash2 size={16} /> Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL SANCIONAR JUGADOR */}
      {modalSancionJugador && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={crearSancionJugador} className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-liga-azul mb-4">Sancionar Jugador</h3>
            <div className="space-y-3 mb-6">
              {!nuevaSancionJugador.jugador ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula del Jugador</label>
                  <div className="flex gap-2">
                    <input required type="text" placeholder="Ej: 1234567890" value={nuevaSancionJugador.cedula} onChange={e => setNuevaSancionJugador({...nuevaSancionJugador, cedula: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    <button type="button" onClick={buscarJugadorSancion} className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold">Buscar</button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                  <p className="font-bold text-blue-900">{nuevaSancionJugador.jugador.apellidos} {nuevaSancionJugador.jugador.nombres}</p>
                  <p className="text-xs text-blue-700">C.C. {nuevaSancionJugador.jugador.cedula}</p>
                  <button type="button" onClick={() => setNuevaSancionJugador({...nuevaSancionJugador, jugador: null, cedula: ''})} className="text-xs text-red-600 font-semibold mt-2 underline">Cambiar jugador</button>
                </div>
              )}

              {nuevaSancionJugador.jugador && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Sanción</label>
                    <select value={nuevaSancionJugador.tipo} onChange={e => setNuevaSancionJugador({...nuevaSancionJugador, tipo: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option value="roja_directa">Roja Directa</option>
                      <option value="doble_amarilla">Doble Amarilla</option>
                      <option value="amarilla">Amarilla</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo (Opcional)</label>
                    <input type="text" placeholder="Ej: Agresión, Reclamos..." value={nuevaSancionJugador.motivo} onChange={e => setNuevaSancionJugador({...nuevaSancionJugador, motivo: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fechas de Sanción</label>
                    <input required type="number" min="1" value={nuevaSancionJugador.fechas_sancion} onChange={e => setNuevaSancionJugador({...nuevaSancionJugador, fechas_sancion: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalSancionJugador(false)} disabled={registrando} className="flex-1 py-2 border rounded font-semibold text-gray-700">Cancelar</button>
              <button type="submit" disabled={registrando || !nuevaSancionJugador.jugador} className="flex-1 bg-liga-azul text-white py-2 rounded font-semibold disabled:opacity-50">
                {registrando ? 'Guardando...' : 'Sancionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SANCIONAR EQUIPO */}
      {modalSancionEquipo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={crearSancionEquipo} className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-liga-azul mb-4">Sancionar Equipo</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Equipo</label>
                <select required value={nuevaSancionEquipo.equipo_id} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, equipo_id: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="">Seleccione un equipo...</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Sanción</label>
                <select value={nuevaSancionEquipo.tipo} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, tipo: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="multa_economica">Multa Económica</option>
                  <option value="perdida_puntos">Pérdida de Puntos</option>
                  <option value="suspension_cancha">Suspensión de Cancha</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo</label>
                <input required type="text" placeholder="Ej: Inconducta de la hinchada" value={nuevaSancionEquipo.motivo} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, motivo: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Multa ($) - Opcional</label>
                  <input type="number" step="0.01" min="0" value={nuevaSancionEquipo.monto} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, monto: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fechas Susp.</label>
                  <input type="number" min="0" value={nuevaSancionEquipo.fechas_sancion} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, fechas_sancion: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción (Opcional)</label>
                <input type="text" placeholder="Detalles adicionales..." value={nuevaSancionEquipo.descripcion} onChange={e => setNuevaSancionEquipo({...nuevaSancionEquipo, descripcion: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalSancionEquipo(false)} disabled={registrando} className="flex-1 py-2 border rounded font-semibold text-gray-700">Cancelar</button>
              <button type="submit" disabled={registrando} className="flex-1 bg-liga-azul text-white py-2 rounded font-semibold disabled:opacity-50">
                {registrando ? 'Guardando...' : 'Sancionar Equipo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}