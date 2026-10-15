/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, MapPin, CheckCircle, Search, Filter, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Calendario() {
  const [cargando, setCargando] = useState(true)
  const [partidos, setPartidos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos | programados | finalizados

  const cargarCalendario = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id, fecha_partido, hora_partido, lugar, estado, goles_local, goles_visitante,
          equipo_local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
          equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre, disciplina, categoria)
        `)
        .order('fecha_partido', { ascending: true })

      if (error) throw error
      setPartidos(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar calendario de partidos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarCalendario()
  }, [cargarCalendario])

  const partidosFiltrados = partidos.filter((p) => {
    const eqLocal = p.equipo_local?.nombre?.toLowerCase() || ''
    const eqVis = p.equipo_visitante?.nombre?.toLowerCase() || ''
    const txt = busqueda.toLowerCase()

    if (busqueda && !eqLocal.includes(txt) && !eqVis.includes(txt)) return false

    if (filtroDisciplina && p.equipo_local?.disciplina !== filtroDisciplina) return false

    if (filtroEstado === 'programados' && p.estado === 'finalizado') return false
    if (filtroEstado === 'finalizados' && p.estado !== 'finalizado') return false

    return true
  })

  const programados = partidos.filter((p) => p.estado !== 'finalizado').length
  const finalizados = partidos.filter((p) => p.estado === 'finalizado').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-liga-azul" size={28} />
            Módulo de Calendario y Fixture
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Programación semanal de partidos, canchas, horarios y resultados
          </p>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Partidos</p>
            <p className="text-2xl font-bold text-liga-azul mt-1">{partidos.length}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-liga-azul rounded-lg flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Programados</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{programados}</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Finalizados</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{finalizados}</p>
          </div>
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filtroDisciplina}
              onChange={(e) => setFiltroDisciplina(e.target.value)}
              className="bg-transparent border-none text-gray-700 text-sm focus:outline-none"
            >
              <option value="">Todas las disciplinas</option>
              <option value="futsala">Futsala</option>
              <option value="futbol">Fútbol</option>
              <option value="ecuavoly">Ecuavoly</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-transparent border-none text-gray-700 text-sm focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="programados">Próximos / Programados</option>
              <option value="finalizados">Finalizados</option>
            </select>
          </div>

          <button
            onClick={cargarCalendario}
            className="p-2 text-gray-600 hover:text-liga-azul rounded-lg hover:bg-gray-100 transition-colors"
            title="Recargar partidos"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Lista de partidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando partidos...</p>
          </div>
        ) : partidosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay partidos programados que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {partidosFiltrados.map((p) => (
              <div key={p.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs text-gray-500 w-full md:w-auto">
                  <div className="bg-blue-50 text-liga-azul px-3 py-1.5 rounded-lg font-semibold text-center min-w-[90px]">
                    <div>{p.fecha_partido || 'Por definir'}</div>
                    <div className="text-[11px] font-normal text-gray-600">{p.hora_partido?.substring(0, 5) || '--:--'}</div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{p.lugar || 'Cancha Principal'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 my-2 md:my-0 flex-1">
                  <div className="text-right font-bold text-gray-800 text-sm md:text-base flex-1">
                    {p.equipo_local?.nombre || 'Equipo Local'}
                  </div>

                  <div className="bg-gray-100 px-4 py-1.5 rounded-lg font-mono font-bold text-sm text-gray-800 min-w-[70px] text-center">
                    {p.estado === 'finalizado'
                      ? `${p.goles_local ?? 0} - ${p.goles_visitante ?? 0}`
                      : 'VS'}
                  </div>

                  <div className="text-left font-bold text-gray-800 text-sm md:text-base flex-1">
                    {p.equipo_visitante?.nombre || 'Equipo Visitante'}
                  </div>
                </div>

                <div className="w-full md:w-auto text-right">
                  {p.estado === 'finalizado' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                      ✓ Finalizado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      ⏱ Programado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}