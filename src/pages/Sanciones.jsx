/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, ShieldAlert, CheckCircle, Search, Filter, RefreshCw, Plus, X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Sanciones() {
  const [cargando, setCargando] = useState(true)
  const [sanciones, setSanciones] = useState([])
  const [jugadoresList, setJugadoresList] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activas') // 'activas' | 'todas'

  // Modal para Nueva Sanción
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [formSancion, setFormSancion] = useState({
    jugador_id: '',
    tipo: 'roja',
    motivo: '',
    fechas_sancion: 1,
  })

  const cargarSanciones = useCallback(async () => {
    setCargando(true)
    try {
      let query = supabase
        .from('sanciones_jugador')
        .select(`
          id, tipo, motivo, fechas_sancion, fechas_cumplidas, fecha_inicio, activa,
          jugador:jugadores (id, nombres, apellidos, cedula),
          equipo:equipos (nombre)
        `)
        .order('creado_en', { ascending: false })

      if (filtroEstado === 'activas') {
        query = query.eq('activa', true)
      }

      const { data, error } = await query
      if (error) throw error

      setSanciones(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar sanciones')
    } finally {
      setCargando(false)
    }
  }, [filtroEstado])

  const cargarJugadores = useCallback(async () => {
    const { data } = await supabase
      .from('jugadores')
      .select('id, nombres, apellidos, cedula')
      .eq('activo', true)
      .order('apellidos')
    setJugadoresList(data || [])
  }, [])

  useEffect(() => {
    cargarSanciones()
    cargarJugadores()
  }, [cargarSanciones, cargarJugadores])

  async function registrarSancion() {
    if (!formSancion.jugador_id) {
      toast.error('Selecciona un jugador')
      return
    }
    if (!formSancion.motivo.trim()) {
      toast.error('Escribe el motivo de la sanción')
      return
    }

    setGuardando(true)
    try {
      const { error } = await supabase.from('sanciones_jugador').insert({
        jugador_id: formSancion.jugador_id,
        tipo: formSancion.tipo,
        motivo: formSancion.motivo.trim(),
        fechas_sancion: parseInt(formSancion.fechas_sancion) || 1,
        fechas_cumplidas: 0,
        activa: true,
      })

      if (error) throw error

      toast.success('Sanción registrada correctamente')
      setModalAbierto(false)
      setFormSancion({ jugador_id: '', tipo: 'roja', motivo: '', fechas_sancion: 1 })
      cargarSanciones()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar sanción: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const sancionesFiltradas = sanciones.filter((s) => {
    if (!busqueda) return true
    const txt = busqueda.toLowerCase()
    const nombre = `${s.jugador?.nombres} ${s.jugador?.apellidos}`.toLowerCase()
    return nombre.includes(txt) || s.motivo?.toLowerCase().includes(txt)
  })

  const totalSanciones = sanciones.length
  const activasCount = sanciones.filter((s) => s.activa).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-liga-rojo" size={28} />
            Módulo de Sanciones y Disciplina
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Control de tarjetas amarillas, rojas, suspensiones y cumplimiento de fechas
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="bg-liga-rojo text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-liga-rojo/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Registrar Sanción
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Sanciones Activas</p>
            <p className="text-2xl font-bold text-liga-rojo mt-1">{activasCount}</p>
          </div>
          <div className="w-11 h-11 bg-red-50 text-liga-rojo rounded-xl flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Registradas</p>
            <p className="text-2xl font-bold text-liga-azul mt-1">{totalSanciones}</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-liga-azul rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Buscador y Filtro */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por jugador o motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent border-none text-gray-700 text-sm focus:outline-none"
            >
              <option value="activas">Solo sanciones activas</option>
              <option value="todas">Todas las sanciones</option>
            </select>
          </div>

          <button
            onClick={cargarSanciones}
            className="p-2 text-gray-600 hover:text-liga-azul rounded-lg hover:bg-gray-100 transition-colors"
            title="Recargar sanciones"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabla de sanciones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando sanciones...</p>
          </div>
        ) : sancionesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay sanciones registradas con esos criterios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Jugador</th>
                  <th className="px-6 py-3.5">Equipo</th>
                  <th className="px-6 py-3.5">Tipo de Sanción</th>
                  <th className="px-6 py-3.5">Motivo</th>
                  <th className="px-6 py-3.5">Fechas Cumplidas</th>
                  <th className="px-6 py-3.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sancionesFiltradas.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {s.jugador?.apellidos} {s.jugador?.nombres}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {s.equipo?.nombre || '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold capitalize text-liga-rojo">
                      {s.tipo?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {s.motivo || 'Sin motivo especificado'}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {s.fechas_cumplidas || 0} / {s.fechas_sancion || 1} fecha(s)
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.activa ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-liga-rojo">
                          <AlertTriangle size={13} /> Sanción Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          <CheckCircle size={13} /> Cumplida
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Registrar Sanción */}
      {modalAbierto && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalAbierto(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-liga-rojo flex items-center gap-2">
                  <AlertTriangle size={20} /> Registrar Nueva Sanción
                </h3>
                <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Seleccionar Jugador <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formSancion.jugador_id}
                    onChange={(e) => setFormSancion({ ...formSancion, jugador_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  >
                    <option value="">Seleccionar jugador...</option>
                    {jugadoresList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.apellidos} {j.nombres} ({j.cedula})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Tipo de Sanción <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formSancion.tipo}
                    onChange={(e) => setFormSancion({ ...formSancion, tipo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  >
                    <option value="roja">Roja Directa (2 fechas)</option>
                    <option value="doble_amarilla">Doble Amarilla (1 fecha)</option>
                    <option value="amarilla">Acumulación de Amarillas</option>
                    <option value="suspension_admin">Suspensión Administrativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Número de Fechas de Suspensión
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formSancion.fechas_sancion}
                    onChange={(e) => setFormSancion({ ...formSancion, fechas_sancion: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Motivo / Observaciones <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formSancion.motivo}
                    onChange={(e) => setFormSancion({ ...formSancion, motivo: e.target.value })}
                    placeholder="Ej. Conducta antideportiva en el minuto 35"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarSancion}
                  disabled={guardando}
                  className="flex-1 bg-liga-rojo text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-liga-rojo/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> {guardando ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}