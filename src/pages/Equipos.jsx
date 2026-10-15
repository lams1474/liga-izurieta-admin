/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Plus, Search, Filter, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Equipos() {
  const [cargando, setCargando] = useState(true)
  const [equipos, setEquipos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  const cargarEquipos = useCallback(async () => {
    setCargando(true)
    try {
      let query = supabase.from('equipos').select('*').order('nombre')

      if (filtroDisciplina) {
        query = query.eq('disciplina', filtroDisciplina)
      }
      if (filtroCategoria) {
        query = query.eq('categoria', filtroCategoria)
      }

      const { data, error } = await query
      if (error) throw error

      setEquipos(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar equipos')
    } finally {
      setCargando(false)
    }
  }, [filtroDisciplina, filtroCategoria])

  useEffect(() => {
    cargarEquipos()
  }, [cargarEquipos])

  const equiposFiltrados = equipos.filter((eq) =>
    eq.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalEquipos = equipos.length
  const totalFutsala = equipos.filter((e) => e.disciplina === 'futsala').length
  const totalFutbol = equipos.filter((e) => e.disciplina === 'futbol').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-liga-azul" size={28} />
            Módulo de Equipos / Clubes
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión general de clubes afiliados, disciplinas y categorías
          </p>
        </div>
        <button
          onClick={() => toast.success('Próximamente: Formulario Crear Equipo')}
          className="bg-liga-azul text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-liga-azul/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Nuevo Equipo
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Equipos</p>
            <p className="text-2xl font-bold text-liga-azul mt-1">{totalEquipos}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-liga-azul rounded-lg flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Futsala</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalFutsala}</p>
          </div>
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Fútbol Senior</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{totalFutbol}</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
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
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-transparent border-none text-gray-700 text-sm focus:outline-none"
            >
              <option value="">Todas las categorías</option>
              <option value="hombres">Hombres</option>
              <option value="mujeres">Mujeres</option>
              <option value="sub12">Sub-12</option>
              <option value="master40">Master 40</option>
            </select>
          </div>

          <button
            onClick={cargarEquipos}
            className="p-2 text-gray-600 hover:text-liga-azul rounded-lg hover:bg-gray-100 transition-colors"
            title="Recargar equipos"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabla de Equipos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando clubes...</p>
          </div>
        ) : equiposFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No se encontraron equipos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Equipo</th>
                  <th className="px-6 py-3.5">Disciplina</th>
                  <th className="px-6 py-3.5">Categoría</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equiposFiltrados.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-liga-azul/10 text-liga-azul flex items-center justify-center font-bold text-xs">
                        {eq.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      {eq.nombre}
                    </td>
                    <td className="px-6 py-4 text-gray-700 capitalize">
                      {eq.disciplina}
                    </td>
                    <td className="px-6 py-4 text-gray-700 capitalize">
                      {eq.categoria}
                    </td>
                    <td className="px-6 py-4">
                      {eq.activo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle2 size={13} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <XCircle size={13} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <button
                        onClick={() => toast.success(`Ver detalle de ${eq.nombre}`)}
                        className="text-liga-azul hover:underline text-xs"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}