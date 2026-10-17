/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldAlert, DollarSign, CheckCircle, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Sanciones() {
  const [vista, setVista] = useState('sanciones') // 'sanciones' | 'deudas'
  const [sanciones, setSanciones] = useState([])
  const [deudas, setDeudas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  async function cargarDatos() {
    setCargando(true)
    try {
      // 1. Cargar sanciones activas
      const { data: s } = await supabase
        .from('sanciones_jugador')
        .select(`
          id, tipo, motivo, fechas_sancion, fechas_cumplidas, fecha_inicio, activa,
          jugador:jugadores!sanciones_jugador_jugador_id_fkey (id, apellidos, nombres, cedula),
          equipo:equipos!sanciones_jugador_equipo_id_fkey (nombre)
        `)
        .eq('activa', true)
        .order('creado_en', { ascending: false })

      // 2. Cargar deudas pendientes
      const { data: d } = await supabase
        .from('deudas_jugador')
        .select(`
          id, concepto, monto, monto_pagado, fecha_emision,
          jugador:jugadores!deudas_jugador_jugador_id_fkey (id, apellidos, nombres, cedula),
          equipo:equipos!deudas_jugador_equipo_id_fkey (nombre)
        `)
        .order('creado_en', { ascending: false })

      setSanciones(s || [])
      setDeudas((d || []).filter(item => item.monto_pagado < item.monto))
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

  // === ACCIONES DE SANCIONES ===
  async function eliminarSancion(id) {
    if (!window.confirm('¿Eliminar esta sanción permanentemente? El jugador quedará habilitado.')) return
    const { error } = await supabase.from('sanciones_jugador').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Sanción eliminada')
    cargarDatos()
  }

  async function marcarCumplida(id, fechasSancion) {
    const { error } = await supabase.from('sanciones_jugador').update({
      fechas_cumplidas: fechasSancion,
      activa: false
    }).eq('id', id)
    if (error) return toast.error('Error al actualizar')
    toast.success('Sanción marcada como cumplida')
    cargarDatos()
  }

  // === ACCIONES DE DEUDAS ===
  async function eliminarDeuda(id) {
    if (!window.confirm('¿Eliminar esta deuda permanentemente? El jugador quedará habilitado.')) return
    const { error } = await supabase.from('deudas_jugador').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Deuda eliminada')
    cargarDatos()
  }

  async function marcarPagada(id, monto) {
    const { error } = await supabase.from('deudas_jugador').update({
      monto_pagado: monto
    }).eq('id', id)
    if (error) return toast.error('Error al actualizar')
    toast.success('Deuda marcada como pagada')
    cargarDatos()
  }

  // Filtros
  const sancionesFiltradas = sanciones.filter(s => {
    const texto = busqueda.toLowerCase()
    return s.jugador?.apellidos.toLowerCase().includes(texto) || 
           s.jugador?.nombres.toLowerCase().includes(texto) || 
           s.jugador?.cedula.includes(texto)
  })

  const deudasFiltradas = deudas.filter(d => {
    const texto = busqueda.toLowerCase()
    return d.jugador?.apellidos.toLowerCase().includes(texto) || 
           d.jugador?.nombres.toLowerCase().includes(texto) || 
           d.jugador?.cedula.includes(texto)
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Gestión de Sanciones y Deudas</h1>
        <p className="text-gray-500 text-sm mt-1">Administra las suspensiones y multas de los jugadores</p>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setVista('sanciones')}
          className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
            vista === 'sanciones' ? 'bg-liga-azul text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShieldAlert size={20} />
          Sanciones (Tarjetas)
        </button>
        <button
          onClick={() => setVista('deudas')}
          className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
            vista === 'deudas' ? 'bg-liga-azul text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <DollarSign size={20} />
          Deudas (Multas)
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por jugador o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-500">Cargando datos...</div>
      ) : (
        <>
          {/* VISTA SANCIONES */}
          {vista === 'sanciones' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {sancionesFiltradas.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <ShieldAlert size={48} className="mx-auto text-gray-300 mb-2" />
                  No hay sanciones activas registradas.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sancionesFiltradas.map(s => (
                    <div key={s.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{s.jugador?.apellidos} {s.jugador?.nombres}</p>
                        <p className="text-sm text-gray-500">{s.equipo?.nombre} | C.C. {s.jugador?.cedula}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-semibold capitalize">
                            {s.tipo.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold text-gray-600">
                            {s.motivo}
                          </span>
                          <span className="text-xs font-bold text-liga-azul">
                            (Faltan {s.fechas_sancion - s.fechas_cumplidas} fechas)
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => marcarCumplida(s.id, s.fechas_sancion)}
                          className="flex-1 sm:flex-none bg-green-100 text-green-700 px-3 py-2 rounded-md font-semibold hover:bg-green-200 flex items-center justify-center gap-1 text-sm"
                          title="Marcar como cumplida"
                        >
                          <CheckCircle size={16} /> Cumplir
                        </button>
                        <button
                          onClick={() => eliminarSancion(s.id)}
                          className="flex-1 sm:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-md font-semibold hover:bg-red-200 flex items-center justify-center gap-1 text-sm"
                          title="Eliminar sanción"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
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
                <div className="p-12 text-center text-gray-500">
                  <DollarSign size={48} className="mx-auto text-gray-300 mb-2" />
                  No hay deudas pendientes registradas.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {deudasFiltradas.map(d => (
                    <div key={d.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-800">{d.jugador?.apellidos} {d.jugador?.nombres}</p>
                        <p className="text-sm text-gray-500">{d.equipo?.nombre} | C.C. {d.jugador?.cedula}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold">
                            {d.concepto}
                          </span>
                          <span className="text-xs font-bold text-liga-rojo">
                            Saldo: ${(d.monto - d.monto_pagado).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => marcarPagada(d.id, d.monto)}
                          className="flex-1 sm:flex-none bg-green-100 text-green-700 px-3 py-2 rounded-md font-semibold hover:bg-green-200 flex items-center justify-center gap-1 text-sm"
                          title="Marcar como pagada"
                        >
                          <CheckCircle size={16} /> Pagar
                        </button>
                        <button
                          onClick={() => eliminarDeuda(d.id)}
                          className="flex-1 sm:flex-none bg-red-100 text-red-700 px-3 py-2 rounded-md font-semibold hover:bg-red-200 flex items-center justify-center gap-1 text-sm"
                          title="Eliminar deuda"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}