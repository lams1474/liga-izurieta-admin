import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, ArrowLeft, Users, CheckCircle, Save, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Actas() {
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)
  
  // Reglas de la disciplina (min_jugadores, max_acta)
  const [reglas, setReglas] = useState({ min_jugadores: 4, max_acta: 12 })

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

  // Al seleccionar un partido, cargar reglas y jugadores
  async function seleccionarPartido(partido) {
    setPartidoSeleccionado(partido)
    setPlanilla({})
    setCargando(true)

    try {
      // 1. Cargar reglas de la disciplina
      const { data: rule } = await supabase
        .from('reglas_disciplina')
        .select('min_jugadores, max_acta')
        .eq('disciplina', partido.local.disciplina)
        .eq('categoria', partido.local.categoria)
        .single()
      
      setReglas(rule || { min_jugadores: 4, max_acta: 12 })

      // 2. Cargar jugadores del equipo local
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

      // 3. Cargar jugadores del equipo visitante
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

      // 4. Ver si ya existe una planilla guardada para este partido
      const { data: planillaExistente } = await supabase
        .from('planilla_partido')
        .select('*')
        .eq('partido_id', partido.id)

      const formatList = (list) => (list || [])
        .filter(i => i.jugador)
        .map(i => ({ ...i.jugador, dorsal: i.dorsal }))
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos))

      setJugadoresLocal(formatList(local))
      setJugadoresVisitante(formatList(visitante))

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

  // Marcar/Desmarcar un jugador (con límite máximo en acta)
  function toggleJugador(jugadorId, esLocal) {
    setPlanilla(prev => {
      const actual = prev[jugadorId]

      // Si ya está seleccionado, lo quitamos o cambiamos de estado
      if (actual) {
        if (actual === 'titular') return { ...prev, [jugadorId]: 'suplente' }
        const nuevo = { ...prev }
        delete nuevo[jugadorId]
        return nuevo
      }

      // Si no está seleccionado, verificar el máximo en acta
      const jugadoresEquipo = esLocal ? jugadoresLocal : jugadoresVisitante
      const seleccionadosEquipo = Object.keys(prev).filter(id => jugadoresEquipo.some(j => j.id === id)).length

      if (seleccionadosEquipo >= reglas.max_acta) {
        toast.error(`Máximo ${reglas.max_acta} jugadores por equipo en el acta.`)
        return prev
      }

      return { ...prev, [jugadorId]: 'titular' }
    })
  }

  // Guardar la planilla en Supabase
  async function guardarPlanilla() {
    if (!partidoSeleccionado) return

    const titularesLocal = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesVisitante = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresVisitante.some(j => j.id === id)).length

    const min = reglas.min_jugadores

    // Lógica de No Presentación (3x0)
    if (titularesLocal < min || titularesVisitante < min) {
      let msg = 'Atención:\n'
      if (titularesLocal < min) msg += `- ${partidoSeleccionado.local.nombre} tiene ${titularesLocal} titulares (Mínimo: ${min}).\n`
      if (titularesVisitante < min) msg += `- ${partidoSeleccionado.visitante.nombre} tiene ${titularesVisitante} titulares (Mínimo: ${min}).\n`
      msg += '\n¿Deseas declarar este partido como NO PRESENTADO (Marcador 3x0)?'
      
      if (!window.confirm(msg)) return

      // Calcular 3x0
      let gL = 0, gV = 0
      if (titularesLocal < min && titularesVisitante >= min) gV = 3
      if (titularesVisitante < min && titularesLocal >= min) gL = 3

      setGuardando(true)
      try {
        // Guardar planilla de todos modos
        await supabase.from('planilla_partido').delete().eq('partido_id', partidoSeleccionado.id)
        const registros = Object.entries(planilla).map(([jugadorId, rol]) => {
          const esLocal = jugadoresLocal.some(j => j.id === jugadorId)
          const equipoId = esLocal ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id
          const jugadorData = esLocal ? jugadoresLocal.find(j => j.id === jugadorId) : jugadoresVisitante.find(j => j.id === jugadorId)
          return {
            partido_id: partidoSeleccionado.id, equipo_id: equipoId, jugador_id: jugadorId,
            es_titular: rol === 'titular', dorsal: jugadorData?.dorsal || null
          }
        })
        if (registros.length > 0) await supabase.from('planilla_partido').insert(registros)

        // Actualizar partido con 3x0
        await supabase.from('partidos').update({
          jugado: true, goles_local: gL, goles_visitante: gV,
          observaciones: 'Partido declarado No Presentado (3x0)'
        }).eq('id', partidoSeleccionado.id)

        toast.success('Partido registrado como No Presentado (3x0)')
        setPartidoSeleccionado(null)
      } catch (err) {
        toast.error('Error al guardar')
      } finally {
        setGuardando(false)
      }
      return
    }

    // Guardado Normal (si cumple los mínimos)
    setGuardando(true)
    try {
      await supabase.from('planilla_partido').delete().eq('partido_id', partidoSeleccionado.id)

      const registros = Object.entries(planilla).map(([jugadorId, rol]) => {
        const esLocal = jugadoresLocal.some(j => j.id === jugadorId)
        const equipoId = esLocal ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id
        const jugadorData = esLocal ? jugadoresLocal.find(j => j.id === jugadorId) : jugadoresVisitante.find(j => j.id === jugadorId)
        return {
          partido_id: partidoSeleccionado.id, equipo_id: equipoId, jugador_id: jugadorId,
          es_titular: rol === 'titular', dorsal: jugadorData?.dorsal || null
        }
      })

      const { error } = await supabase.from('planilla_partido').insert(registros)
      if (error) throw error

      toast.success('Planilla guardada correctamente')
      setPartidoSeleccionado(null)
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

  // Calcular titulares actuales para mostrar en pantalla
  const titularesL = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresLocal.some(j => j.id === id)).length
  const titularesV = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresVisitante.some(j => j.id === id)).length

  // VISTA 2: Armado de planilla
  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header de la planilla */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setPartidoSeleccionado(null)} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold">
          <ArrowLeft size={18} /> Volver
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-800">
            {partidoSeleccionado.local?.nombre} vs {partidoSeleccionado.visitante?.nombre}
          </h2>
          <p className="text-xs text-gray-500">Mínimo para jugar: {reglas.min_jugadores} titulares</p>
        </div>
        <button onClick={guardarPlanilla} disabled={guardando} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          {guardando ? 'Guardando...' : <><Save size={18} /> Guardar</>}
        </button>
      </div>

      {/* Alerta si falta el mínimo */}
      {(titularesL < reglas.min_jugadores || titularesV < reglas.min_jugadores) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start gap-2">
          <AlertTriangle className="text-red-500 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-red-800">Faltan jugadores para el mínimo reglamentario</p>
            <p className="text-sm text-red-600">
              Si guardas así, el sistema preguntará si deseas declarar el partido como <strong>No Presentado (3x0)</strong>.
            </p>
          </div>
        </div>
      )}

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
          <div className="bg-liga-azul text-white p-3 text-center flex justify-between items-center px-4">
            <h3 className="font-bold">{partidoSeleccionado.local?.nombre}</h3>
            <span className={`text-sm font-bold ${titularesL < reglas.min_jugadores ? 'text-red-300' : 'text-green-300'}`}>
              {titularesL} / {reglas.min_jugadores} Titulares
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {jugadoresLocal.map(j => {
              const estado = planilla[j.id]
              return (
                <div key={j.id} onClick={() => toggleJugador(j.id, true)} className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">{j.dorsal || '-'}</div>
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
          <div className="bg-gray-700 text-white p-3 text-center flex justify-between items-center px-4">
            <h3 className="font-bold">{partidoSeleccionado.visitante?.nombre}</h3>
            <span className={`text-sm font-bold ${titularesV < reglas.min_jugadores ? 'text-red-300' : 'text-green-300'}`}>
              {titularesV} / {reglas.min_jugadores} Titulares
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {jugadoresVisitante.map(j => {
              const estado = planilla[j.id]
              return (
                <div key={j.id} onClick={() => toggleJugador(j.id, false)} className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">{j.dorsal || '-'}</div>
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