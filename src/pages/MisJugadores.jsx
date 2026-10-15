/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, Eye, Edit, AlertCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import JugadorFormDrawer from '../components/JugadorFormDrawer'
import JugadorDetalleDrawer from '../components/JugadorDetalleDrawer'

export default function MisJugadores() {
  const { usuario } = useAuth()

  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')

  // Drawers
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const [jugadorEditando, setJugadorEditando] = useState(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)
  const [jugadorDetalle, setJugadorDetalle] = useState(null)

  // Período de inscripción activo
  const [periodoActivo, setPeriodoActivo] = useState(null)
  const [ahora, setAhora] = useState(new Date())

  // Verificar si tiene club asignado
  const clubId = usuario?.club_id

  // Cargar jugadores del club
  async function recargar() {
    if (!clubId) {
      setCargando(false)
      return
    }

    setCargando(true)

    const { data, error } = await supabase
      .from('jugador_equipo')
      .select(`
        id,
        dorsal,
        posicion,
        activo,
        jugador:jugadores!jugador_equipo_jugador_id_fkey (
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
          consentimiento_firmado,
          foto_actualizada,
          activo
        ),
        equipo:equipos!jugador_equipo_equipo_id_fkey (
          id, nombre, disciplina, categoria
        )
      `)
      .eq('equipo_id', clubId)
      .eq('activo', true)

    if (error) {
      console.error(error)
      toast.error('Error al cargar jugadores')
      setJugadores([])
    } else {
      const lista = (data || [])
        .filter((i) => i.jugador)
        .map((i) => ({
          ...i.jugador,
          inscripcion_id: i.id,
          dorsal: i.dorsal,
          posicion: i.posicion,
          equipo: i.equipo,
        }))

      setJugadores(lista)
    }
    setCargando(false)
  }

  // Cargar período activo
  async function cargarPeriodo() {
    const { data, error } = await supabase
      .from('periodos_inscripcion')
      .select('*')
      .eq('activo', true)
      .gte('fecha_fin', new Date().toISOString())
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setPeriodoActivo(data)
    } else {
      setPeriodoActivo(null)
    }
  }

  useEffect(() => {
    recargar()
    cargarPeriodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  // Actualizar el reloj cada minuto
  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Calcular tiempo restante
  const tiempoRestante = (() => {
    if (!periodoActivo) return null
    const fin = new Date(periodoActivo.fecha_fin)
    const diff = fin - ahora
    if (diff <= 0) return null

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return { dias, horas, minutos }
  })()

  // Filtrar
  const jugadoresFiltrados = jugadores.filter((j) => {
    if (filtroEstado === 'activos' && !j.activo) return false
    if (filtroEstado === 'calificados' && !j.calificado) return false
    if (filtroEstado === 'no_calificados' && j.calificado) return false

    if (busqueda) {
      const texto = busqueda.toLowerCase()
      const nombreCompleto = `${j.apellidos} ${j.nombres}`.toLowerCase()
      if (!nombreCompleto.includes(texto) && !j.cedula.includes(texto)) {
        return false
      }
    }

    return true
  })

  // Funciones de UI
  function abrirDrawerNuevo() {
    if (!periodoActivo) {
      toast.error('El período de inscripción no está activo')
      return
    }
    setJugadorEditando(null)
    setDrawerAbierto(true)
  }

  function abrirDrawerEditar(jugador) {
    if (!periodoActivo) {
      toast.error('El período de inscripción no está activo')
      return
    }
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
    if (!periodoActivo) {
      toast.error('El período de inscripción no está activo')
      return
    }

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

  // ============ RENDER ============

  // Si no tiene club asignado
  if (!clubId) {
    return (
      <div className="max-w-4xl">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-yellow-800 mb-2">
                No tienes un club asignado
              </h2>
              <p className="text-sm text-yellow-700">
                Contacta al administrador de la liga para que te asigne a un club.
                Sin un club asignado no puedes gestionar jugadores.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">
            Mis Jugadores
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {cargando
              ? 'Cargando...'
              : `${jugadoresFiltrados.length} de ${jugadores.length} jugadores`}
          </p>
        </div>

        <button
          onClick={abrirDrawerNuevo}
          disabled={!periodoActivo}
          className={`px-4 py-2 rounded-md font-semibold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto ${
            periodoActivo
              ? 'bg-liga-azul text-white hover:bg-liga-azul/90'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Plus size={18} />
          Agregar Jugador
        </button>
      </div>

      {/* Banner del período */}
      {periodoActivo && tiempoRestante ? (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 text-white p-2 rounded-full">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-bold text-green-800">
                  Período de Inscripción Activo
                </h3>
                <p className="text-sm text-green-700">
                  Puedes inscribir y editar tus jugadores
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-700">Termina en</p>
              <p className="font-bold text-lg text-green-800">
                {tiempoRestante.dias > 0 && `${tiempoRestante.dias}d `}
                {tiempoRestante.horas > 0 && `${tiempoRestante.horas}h `}
                {tiempoRestante.minutos}m
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-yellow-800">
                El período de inscripción NO está activo
              </h3>
              <p className="text-sm text-yellow-700">
                Solo puedes ver tus jugadores. Para agregar o editar, espera a que la
                liga active el período de inscripción.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="activos">Todos los activos</option>
            <option value="calificados">Solo calificados</option>
            <option value="no_calificados">Solo no calificados</option>
          </select>
        </div>
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
            {jugadores.length === 0
              ? 'No tienes jugadores registrados'
              : 'No se encontraron jugadores con esos filtros'}
          </h2>
          <p className="text-gray-500">
            {jugadores.length === 0
              ? 'Agrega tu primer jugador usando el botón "Agregar Jugador"'
              : 'Prueba con otros filtros'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-liga-azul text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Código
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Jugador
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Cédula
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Pase
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Calificado
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {jugadoresFiltrados.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-3 text-sm font-mono text-gray-600">
                      {j.codigo_interno || '—'}
                    </td>
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
                          {!j.foto_actualizada && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-1">
                              Sin foto
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {j.cedula}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {j.estado_pase === 'aprobado' ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                          ✓ Aprobado
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-semibold">
                          {j.estado_pase || 'Pendiente'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {j.calificado ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                          ✓ Sí
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-semibold">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirDetalle(j)}
                          className="p-2 text-liga-azul hover:bg-blue-50 rounded-md transition-colors"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => abrirDrawerEditar(j)}
                          disabled={!periodoActivo}
                          className={`p-2 rounded-md transition-colors ${
                            periodoActivo
                              ? 'text-liga-azul hover:bg-blue-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={
                            periodoActivo
                              ? 'Editar'
                              : 'El período no está activo'
                          }
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawers */}
      <JugadorFormDrawer
        abierto={drawerAbierto}
        onCerrar={cerrarDrawer}
        jugadorEditar={jugadorEditando}
        onGuardado={recargar}
      />

      <JugadorDetalleDrawer
        abierto={detalleAbierto}
        onCerrar={cerrarDetalle}
        jugadorId={jugadorDetalle}
        onEditar={editarDesdeDetalle}
        onCambio={recargar}
      />
    </div>
  )
}