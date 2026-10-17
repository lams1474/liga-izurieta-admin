import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, ArrowLeft, Users, CheckCircle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Actas() {
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)

  // Jugadores de la planilla
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])
  
  // Estado de la planilla (id_jugador: 'titular' | 'suplente')
  const [planilla, setPlanilla] = useState({})
  const [guardando, setGuardando] = useState(false)

  // Cargar partidos programados
  useEffect(() => {
    async function cargarPartidos() {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          id, hora, cancha, fecha_id,
          local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
          visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre),
          fecha:fechas (numero, etapa:etapas(nombre))
        `)
        .eq('jugado', false)
        .order('creado_en', { ascending: false })

      if (error) toast.error('Error al cargar partidos')
      else setPartidos(data || [])
      
      setCargando(false)
    }
    cargarPartidos()
  }, [])

  // Al seleccionar un partido, cargar los jugadores de ambos equipos
  async function seleccionarPartido(partido) {
    setPartidoSeleccionado(partido)
    setPlanilla({})
    setCargando(true)

    try {
      // 1. Cargar jugadores del equipo local
      const { data: local } = await supabase
        .from('jugador_equipo')
        .select(`
          dorsal,
          jugador:jugadores!jugador_equipo_jugador_id_fkey (
            id, apellidos, nombres, codigo_interno
          )
        `)
        .eq('equipo_id', partido.local.id)
        .eq('activo', true)

      // 2. Cargar jugadores del equipo visitante
      const { data: visitante } = await supabase
        .from('jugador_equipo')
        .select(`
          dorsal,
          jugador:jugadores!jugador_equipo_jugador_id_fkey (
            id, apellidos, nombres, codigo_interno
          )
        `)
        .eq('equipo_id', partido.visitante.id)
        .eq('activo', true)

      // 3. Ver si ya existe una planilla guardada para este partido
      const { data: planillaExistente } = await supabase
        .from('planilla_partido')
        .select('*')
        .eq('partido_id', partido.id)

      // Formatear las listas
      const formatList = (list) => (list || [])
        .filter(i => i.jugador)
        .map(i => ({ ...i.jugador, dorsal: i.dorsal }))
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos))

      setJugadoresLocal(formatList(local))
      setJugadoresVisitante(formatList(visitante))

      // Si ya había planilla, cargarla en el estado
      if (planillaExistente && planillaExistente.length > 0) {
        const planillaCargada = {}
        planillaExistente.forEach(p => {
          planillaCargada[p.jugador_id] = p.es_titular ? 'titular' : 'suplente'
        })
        setPlanilla(planillaCargada)
      }

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la planilla')
    } finally {
      setCargando(false)
    }
  }

  // Marcar/Desmarcar un jugador
  function toggleJugador(jugadorId) {
    setPlanilla(prev => {
      const actual = prev[jugadorId]
      if (!actual) return { ...prev, [jugadorId]: 'titular' } // De nada a Titular
      if (actual === 'titular') return { ...prev, [jugadorId]: 'suplente' } // De Titular a Suplente
      
      // Si era suplente, lo quitamos
      const nuevo = { ...prev }
      delete nuevo[jugadorId]
      return nuevo
    })
  }

  // Guardar la planilla en Supabase
  async function guardarPlanilla() {
    if (!partidoSeleccionado) return

    // Validar mínimos
    const titularesLocal = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesVisitante = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresVisitante.some(j => j.id === id)).length

    if (titularesLocal < 4 || titularesVisitante < 4) {
      return toast.error('Debes seleccionar al menos 4 titulares por equipo')
    }

    setGuardando(true)
    try {
      // 1. Borrar planilla anterior de este partido (si existe)
      await supabase.from('planilla_partido').delete().eq('partido_id', partidoSeleccionado.id)

      // 2. Preparar los datos a insertar
      const registros = Object.entries(planilla).map(([jugadorId, rol]) => {
        const esLocal = jugadoresLocal.some(j => j.id === jugadorId)
        const equipoId = esLocal ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id
        const jugadorData = esLocal ? jugadoresLocal.find(j => j.id === jugadorId) : jugadoresVisitante.find(j => j.id === jugadorId)

        return {
          partido_id: partidoSeleccionado.id,
          equipo_id: equipoId,
          jugador_id: jugadorId,
          es_titular: rol === 'titular',
          dorsal: jugadorData?.dorsal || null
        }
      })

      // 3. Insertar en la base de datos
      const { error } = await supabase.from('planilla_partido').insert(registros)
      if (error) throw error

      toast.success('Planilla guardada correctamente')
      setPartidoSeleccionado(null) // Volver a la lista

    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la planilla')
    } finally {
      setGuardando(false)
    }
  }

  // ============ RENDER ============
  
  if (cargando && !partidoSeleccionado) return <div className="p-8 text-center">Cargando partidos...</div>

  // VISTA 1: Lista de partidos
  if (!partidoSeleccionado) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-liga-azul">Actas y Planillas</h1>
          <p className="text-gray-500 text-sm">Selecciona un partido para armar la planilla de juego</p>
        </div>

        {partidos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-2" />
            No hay partidos programados pendientes.
          </div>
        ) : (
          <div className="space-y-3">
            {partidos.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => seleccionarPartido(p)}>
                <div className="flex-1 text-center sm:text-right font-bold text-gray-800">
                  {p.local?.nombre}
                </div>
                <div className="px-6 text-center">
                  <div className="text-xs text-gray-400 font-semibold mb-1">
                    {p.fecha?.etapa?.nombre} - Fecha {p.fecha?.numero}
                  </div>
                  <div className="text-lg font-bold text-liga-azul">VS</div>
                  <div className="text-xs text-gray-500">{p.hora?.slice(0,5) || '--:--'}</div>
                </div>
                <div className="flex-1 text-center sm:text-left font-bold text-gray-800">
                  {p.visitante?.nombre}
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-4">
                  <button className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
                    <Users size={16} /> Armar Planilla
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // VISTA 2: Armado de planilla
  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header de la planilla */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setPartidoSeleccionado(null)}
          className="text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold"
        >
          <ArrowLeft size={18} /> Volver
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-800">
            {partidoSeleccionado.local?.nombre} vs {partidoSeleccionado.visitante?.nombre}
          </h2>
          <p className="text-xs text-gray-500">Haz clic en los jugadores para cambiar su estado</p>
        </div>
        <button
          onClick={guardarPlanilla}
          disabled={guardando}
          className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {guardando ? 'Guardando...' : <><Save size={18} /> Guardar</>}
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 justify-center mb-6 text-sm">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div> Titular</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div> Suplente</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-gray-300 rounded"></div> No convocado</div>
      </div>

      {/* Canchas (Local y Visitante) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* EQUIPO LOCAL */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-liga-azul text-white p-3 text-center">
            <h3 className="font-bold">{partidoSeleccionado.local?.nombre}</h3>
            <p className="text-xs text-liga-amarillo">{partidoSeleccionado.local?.disciplina} · {partidoSeleccionado.local?.categoria}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {jugadoresLocal.map(j => {
              const estado = planilla[j.id]
              return (
                <div 
                  key={j.id} 
                  onClick={() => toggleJugador(j.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                      {j.dorsal || '-'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{j.apellidos} {j.nombres}</p>
                      <p className="text-xs text-gray-500">{j.codigo_interno}</p>
                    </div>
                  </div>
                  {estado === 'titular' && <CheckCircle className="text-green-500" size={20} />}
                  {estado === 'suplente' && <CheckCircle className="text-yellow-500" size={20} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* EQUIPO VISITANTE */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-3 text-center">
            <h3 className="font-bold">{partidoSeleccionado.visitante?.nombre}</h3>
            <p className="text-xs text-gray-300">Visitante</p>
          </div>
          <div className="divide-y divide-gray-100">
            {jugadoresVisitante.map(j => {
              const estado = planilla[j.id]
              return (
                <div 
                  key={j.id} 
                  onClick={() => toggleJugador(j.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                      {j.dorsal || '-'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{j.apellidos} {j.nombres}</p>
                      <p className="text-xs text-gray-500">{j.codigo_interno}</p>
                    </div>
                  </div>
                  {estado === 'titular' && <CheckCircle className="text-green-500" size={20} />}
                  {estado === 'suplente' && <CheckCircle className="text-yellow-500" size={20} />}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}