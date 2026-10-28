import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, Plus, Filter, Eye, Edit, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import JugadorFormDrawer from '../components/JugadorFormDrawer'
import JugadorDetalleDrawer from '../components/JugadorDetalleDrawer'

export default function Jugadores() {
  const navigate = useNavigate()
  const [jugadores, setJugadores] = useState([])
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEquipo, setFiltroEquipo] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')

  // Estado del drawer de formulario
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [jugadorEditando, setJugadorEditando] = useState(null)

  // Estado del drawer de detalle
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [jugadorDetalle, setJugadorDetalle] = useState(null)

  // Cargar equipos al inicio
  useEffect(() => {
    async function cargarEquipos() {
      const { data, error } = await supabase
        .from('equipos')
        .select('id, nombre, disciplina, categoria')
        .eq('activo', true)
        .order('nombre')

      if (!error) setEquipos(data || [])
    }
    cargarEquipos()
  }, [])

  // Recargar jugadores
  async function recargar() {
    setCargando(true)

    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        id,
        codigo_interno,
        apellidos,
        nombres,
        cedula,
        fecha_nacimiento,
        es_menor,
        telefono,
        foto_url,
        carnet_pagado,
        carnet_ano,
        estado_pase,
        calificado,
        activo,
        creado_en,
        inscripciones:jugador_equipo (
          id,
          dorsal,
          activo,
          equipo:equipos!jugador_equipo_equipo_id_fkey (
            id,
            nombre,
            disciplina,
            categoria
          )
        )
      `)
      .eq('activo', true)
      .order('apellidos')

    if (error) {
      console.error(error)
      toast.error('Error al cargar jugadores')
      setJugadores([])
    } else {
      setJugadores(data || [])
    }

    setCargando(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar()
  }, [])

  // Filtrar en el cliente
  const jugadoresFiltrados = jugadores.filter((j) => {
    const tieneInscripcionActiva = j.inscripciones?.some((i) => i.activo)

    if (filtroEstado === 'activos' && !tieneInscripcionActiva) return false
    if (filtroEstado === 'sin_equipo' && tieneInscripcionActiva) return false

    if (busqueda) {
      const texto = busqueda.toLowerCase()
      const nombreCompleto = `${j.apellidos} ${j.nombres}`.toLowerCase()
      if (!nombreCompleto.includes(texto) && !j.cedula.includes(texto)) {
        return false
      }
    }

    if (filtroEquipo || filtroDisciplina || filtroCategoria) {
      const tieneMatch = j.inscripciones?.some((insc) => {
        if (!insc.activo) return false
        const eq = insc.equipo
        if (!eq) return false
        if (filtroEquipo && eq.id !== filtroEquipo) return false
        if (filtroDisciplina && eq.disciplina !== filtroDisciplina) return false
        if (filtroCategoria && eq.categoria !== filtroCategoria) return false
        return true
      })
      if (!tieneMatch) return false
    }

    return true
  })

  const equiposFiltrados = equipos.filter((eq) => {
    if (filtroDisciplina && eq.disciplina !== filtroDisciplina) return false
    if (filtroCategoria && eq.categoria !== filtroCategoria) return false
    return true
  })

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroEquipo('')
    setFiltroDisciplina('')
    setFiltroCategoria('')
    setFiltroEstado('activos')
  }

  function abrirDrawerNuevo() {
    setJugadorEditando(null)
    setDrawerAbierto(true)
  }

  function abrirDrawerEditar(jugador) {
    setJugadorEditando(jugador)
    setDrawerAbierto(true)
  }

  function cerrarDrawer() {
    setDrawerAbierto(false)
    setJugadorEditando(null)
  }

  function abrirDetalle(jugador) {
    setJugadorDetalle(jugador.id)
    setDetalleAbierto(true)
  }

  function cerrarDetalle() {
    setDetalleAbierto(false)
    setJugadorDetalle(null)
  }

  async function editarDesdeDetalle(jugadorId) {
    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        *,
        inscripciones:jugador_equipo (
          id, dorsal, posicion, activo,
          equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria)
        )
      `)
      .eq('id', jugadorId)
      .single()

    if (error || !data) {
      toast.error('No se pudo cargar el jugador')
      return
    }

    cerrarDetalle()
    setJugadorEditando(data)
    setDrawerAbierto(true)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-liga-azul">Jugadores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cargando ? 'Cargando...' : `${jugadoresFiltrados.length} de ${jugadores.length} jugadores`}
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate('/jugadores/importar')} className="bg-liga-amarillo text-liga-azul px-4 py-2 rounded-md font-semibold hover:bg-liga-amarillo/90 flex items-center gap-2 transition-colors">
            <Upload size={18} /> Importar Excel
          </button>
          <button onClick={abrirDrawerNuevo} className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2 transition-colors">
            <Plus size={18} /> Agregar Jugador
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-700">
          <Filter size={18} /> <span className="font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre o cédula..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul" />
          </div>
          <select value={filtroDisciplina} onChange={(e) => { setFiltroDisciplina(e.target.value); setFiltroEquipo('') }} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul">
            <option value="">Todas las disciplinas</option>
            <option value="futbol">Fútbol</option>
            <option value="futsala">Futsala</option>
            <option value="ecuavoly">Ecuavoly</option>
          </select>
          <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setFiltroEquipo('') }} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul">
            <option value="">Todas las categorías</option>
            <option value="hombres">Hombres</option>
            <option value="mujeres">Mujeres</option>
            <option value="sub12">Sub-12</option>
            <option value="master40">Master 40</option>
          </select>
          <select value={filtroEquipo} onChange={(e) => setFiltroEquipo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul">
            <option value="">Todos los equipos</option>
            {equiposFiltrados.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.disciplina} · {eq.categoria})</option>
            ))}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul md:col-span-4">
            <option value="activos">Solo activos en un club</option>
            <option value="sin_equipo">Sin equipo (dados de baja)</option>
            <option value="todos">Todos los jugadores</option>
          </select>
        </div>
        {(busqueda || filtroEquipo || filtroDisciplina || filtroCategoria || filtroEstado !== 'activos') && (
          <button onClick={limpiarFiltros} className="mt-3 text-sm text-liga-rojo hover:underline">Limpiar filtros</button>
        )}
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liga-azul mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando jugadores...</p>
        </div>
      ) : jugadoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            {jugadores.length === 0 ? 'No hay jugadores registrados' : 'No se encontraron jugadores con esos filtros'}
          </h2>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-liga-azul text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Código</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Jugador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Equipo(s) / Disciplinas</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Carnet</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jugadoresFiltrados.map((j) => {
                  const inscripcionesActivas = j.inscripciones?.filter((i) => i.activo) || []

                  return (
                    <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm font-mono text-gray-600">{j.codigo_interno || '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-300">
                            {j.foto_url ? (
                              <img
                                src={j.foto_url}
                                alt={`${j.nombres} ${j.apellidos}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-gray-500">
                                {j.nombres?.[0]}{j.apellidos?.[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {j.apellidos} {j.nombres}
                            </div>
                            {j.es_menor && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                Menor
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {j.cedula}
                      </td>

                      {/* AQUI MOSTRAMOS TODAS LAS DISCIPLINAS ACTIVAS */}
                      <td className="px-3 py-3 text-sm">
                        {inscripcionesActivas.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {inscripcionesActivas.map(insc => (
                              <div key={insc.id} className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">
                                <span className="font-semibold text-gray-800">{insc.equipo?.nombre}</span>
                                <span className="text-gray-500 ml-1 capitalize">({insc.equipo?.disciplina} · {insc.equipo?.categoria})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-semibold">Sin equipo activo</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        {j.carnet_pagado ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">✅ Pagado</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-semibold">⏳ Pendiente</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => abrirDetalle(j)} className="p-2 text-liga-azul hover:bg-blue-50 rounded-md transition-colors" title="Ver detalle"><Eye size={16} /></button>
                          <button onClick={() => abrirDrawerEditar(j)} className="p-2 text-liga-azul hover:bg-blue-50 rounded-md transition-colors" title="Editar"><Edit size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <JugadorFormDrawer abierto={drawerAbierto} onCerrar={cerrarDrawer} jugadorEditar={jugadorEditando} onGuardado={recargar} />
      <JugadorDetalleDrawer abierto={detalleAbierto} onCerrar={cerrarDetalle} jugadorId={jugadorDetalle} onEditar={editarDesdeDetalle} onCambio={recargar} />
    </div>
  )
}