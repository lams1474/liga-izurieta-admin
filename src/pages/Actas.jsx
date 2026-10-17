import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FileText, ArrowLeft, Users, CheckCircle, AlertTriangle, Lock, Target, StopCircle, PenTool } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Actas() {
  const { usuario } = useAuth()
  
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)
  
  const [vista, setVista] = useState('lista')
  const [reglas, setReglas] = useState({ min_jugadores: 4, max_acta: 12 })
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])
  const [planilla, setPlanilla] = useState({})
  
  const [marcador, setMarcador] = useState({ local: 0, visitante: 0 })
  const [eventos, setEventos] = useState([]) 
  const [modalAccion, setModalAccion] = useState(null) 

  const [guardando, setGuardando] = useState(false)

  const esCapitan = usuario?.rol === 'capitan'

  useEffect(() => {
    async function cargarPartidos() {
      let query = supabase.from('partidos').select(`
        id, hora, cancha, fecha_id, jugado, goles_local, goles_visitante,
        local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
        visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre),
        fecha:fechas (numero, etapa:etapas(nombre)),
        acta:actas (id, estado)
      `)

      if (esCapitan) {
        query = query.eq('jugado', true)
      } else {
        query = query.eq('jugado', false)
      }

      const { data, error } = await query.order('creado_en', { ascending: false })

      if (error) toast.error('Error al cargar partidos')
      else setPartidos(data || [])
      
      setCargando(false)
    }
    cargarPartidos()
  }, [vista, esCapitan])

  async function seleccionarPartido(partido) {
    setPartidoSeleccionado(partido)
    setPlanilla({})
    setCargando(true)

    try {
      const { data: rule } = await supabase.from('reglas_disciplina').select('min_jugadores, max_acta').eq('disciplina', partido.local.disciplina).eq('categoria', partido.local.categoria).single()
      setReglas(rule || { min_jugadores: 4, max_acta: 12 })

      // Función auxiliar para cargar y validar jugadores
      const cargarJugadores = async (equipoId) => {
        const { data: inscripciones, error } = await supabase
          .from('jugador_equipo')
          .select(`
            dorsal,
            jugador:jugadores!jugador_equipo_jugador_id_fkey (
              id, apellidos, nombres, codigo_interno
            )
          `)
          .eq('equipo_id', equipoId)
          .eq('activo', true)

        if (error) throw error

        // Validar carnet de cada jugador
        const promesas = (inscripciones || []).filter(i => i.jugador).map(async (i) => {
          const j = i.jugador
          const { data: val } = await supabase.rpc('validar_carnet', {
            p_jugador_id: j.id,
            p_equipo_id: equipoId
          })
          return {
            id: j.id, apellidos: j.apellidos, nombres: j.nombres, codigo_interno: j.codigo_interno,
            dorsal: i.dorsal,
            estado_carnet: val?.[0]?.estado || 'HABILITADO',
            motivos_bloqueo: val?.[0]?.motivos || []
          }
        })

        const jugadoresValidos = await Promise.all(promesas)
        return jugadoresValidos.sort((a, b) => a.apellidos.localeCompare(b.apellidos))
      }

      const local = await cargarJugadores(partido.local.id)
      const visitante = await cargarJugadores(partido.visitante.id)

      setJugadoresLocal(local)
      setJugadoresVisitante(visitante)

      const { data: planillaExistente } = await supabase.from('planilla_partido').select('*').eq('partido_id', partido.id)

      if (planillaExistente && planillaExistente.length > 0) {
        const planillaCargada = {}
        planillaExistente.forEach(p => { planillaCargada[p.jugador_id] = p.es_titular ? 'titular' : 'suplente' })
        setPlanilla(planillaCargada)
      }

      const { data: goles } = await supabase.from('goles').select('*, jugador:jugadores(apellidos, nombres)').eq('partido_id', partido.id)
      const { data: tarjetas } = await supabase.from('sanciones_jugador').select('*, jugador:jugadores(apellidos, nombres)').eq('partido_id', partido.id)
      
      let evs = []
      if (goles) goles.forEach(g => evs.push({ tipo: 'gol', jugador: g.jugador.apellidos, equipo_id: null }))
      if (tarjetas) tarjetas.forEach(t => evs.push({ tipo: t.tipo, jugador: t.jugador.apellidos, equipo_id: null }))
      setEventos(evs)
      
      setMarcador({ local: partido.goles_local || 0, visitante: partido.goles_visitante || 0 })

      if (esCapitan) {
        setVista('firmar_acta')
      } else {
        setVista('planilla')
      }

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar los jugadores del partido')
    } finally {
      setCargando(false)
    }
  }

  function toggleJugador(jugadorId, esLocal) {
    const jugadoresEquipo = esLocal ? jugadoresLocal : jugadoresVisitante
    const jugador = jugadoresEquipo.find(j => j.id === jugadorId)

    if (jugador.estado_carnet === 'BLOQUEADO') {
      return toast.error(`No habilitado: ${jugador.motivos_bloqueo.join(' | ')}`, { duration: 4000 })
    }

    setPlanilla(prev => {
      const actual = prev[jugadorId]
      if (actual) {
        if (actual === 'titular') return { ...prev, [jugadorId]: 'suplente' }
        const nuevo = { ...prev }
        delete nuevo[jugadorId]
        return nuevo
      }
      const seleccionadosEquipo = Object.keys(prev).filter(id => jugadoresEquipo.some(j => j.id === id)).length
      if (seleccionadosEquipo >= reglas.max_acta) {
        toast.error(`Máximo ${reglas.max_acta} jugadores por equipo.`)
        return prev
      }
      return { ...prev, [jugadorId]: 'titular' }
    })
  }

  async function guardarPlanilla(iniciarPartido = false) {
    if (!partidoSeleccionado) return
    const titularesLocal = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesVisitante = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresVisitante.some(j => j.id === id)).length
    const min = reglas.min_jugadores

    if ((titularesLocal < min || titularesVisitante < min) && iniciarPartido) {
      return toast.error('No puedes iniciar el partido sin el mínimo de jugadores')
    }

    setGuardando(true)
    try {
      await supabase.from('planilla_partido').delete().eq('partido_id', partidoSeleccionado.id)
      const registros = Object.entries(planilla).map(([jugadorId, rol]) => {
        const esLocal = jugadoresLocal.some(j => j.id === jugadorId)
        return {
          partido_id: partidoSeleccionado.id, equipo_id: esLocal ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id,
          jugador_id: jugadorId, es_titular: rol === 'titular', dorsal: (esLocal ? jugadoresLocal : jugadoresVisitante).find(j => j.id === jugadorId)?.dorsal
        }
      })
      if (registros.length > 0) await supabase.from('planilla_partido').insert(registros)

      toast.success('Planilla guardada')
      if (iniciarPartido) {
        setVista('partido')
      } else {
        setVista('lista')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function registrarAccion(jugadorId) {
    if (!modalAccion) return
    setGuardando(true)
    try {
      if (modalAccion.tipo === 'gol') {
        await supabase.from('goles').insert({ partido_id: partidoSeleccionado.id, jugador_id: jugadorId, minuto: 0, tipo: 'normal' })
        const nuevosGoles = modalAccion.equipo === 'local' ? marcador.local + 1 : marcador.visitante + 1
        setMarcador({ ...marcador, [modalAccion.equipo]: nuevosGoles })
        await supabase.from('partidos').update({ [modalAccion.equipo === 'local' ? 'goles_local' : 'goles_visitante']: nuevosGoles }).eq('id', partidoSeleccionado.id)
      } else {
        const equipoId = modalAccion.equipo === 'local' ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id
        await supabase.from('sanciones_jugador').insert({
          partido_id: partidoSeleccionado.id, jugador_id: jugadorId, equipo_id: equipoId,
          tipo: modalAccion.tipoTarjeta, motivo: `Tarjeta ${modalAccion.tipoTarjeta}`, fechas_sancion: 0, activa: true,
          registrado_por: usuario.id
        })
      }
      toast.success('Registrado')
      setModalAccion(null)
      
      const { data: goles } = await supabase.from('goles').select('*, jugador:jugadores(apellidos)').eq('partido_id', partidoSeleccionado.id)
      const { data: tarjetas } = await supabase.from('sanciones_jugador').select('*, jugador:jugadores(apellidos)').eq('partido_id', partidoSeleccionado.id)
      let evs = []
      if (goles) goles.forEach(g => evs.push({ tipo: 'gol', jugador: g.jugador.apellidos, equipo_id: null }))
      if (tarjetas) tarjetas.forEach(t => evs.push({ tipo: t.tipo, jugador: t.jugador.apellidos, equipo_id: null }))
      setEventos(evs)

    } catch (err) {
      console.error(err)
      toast.error('Error al registrar')
    } finally {
      setGuardando(false)
    }
  }

  async function finalizarPartido() {
    if (!window.confirm('¿Finalizar el partido? Se enviará a los capitanes para su firma.')) return
    setGuardando(true)
    try {
      await supabase.from('partidos').update({ jugado: true }).eq('id', partidoSeleccionado.id)
      
      let actaId = partidoSeleccionado.acta?.[0]?.id
      if (!actaId) {
        const { data: nuevaActa } = await supabase.from('actas').insert({
          partido_id: partidoSeleccionado.id, estado: 'firmando'
        }).select().single()
        actaId = nuevaActa.id
      }

      const tipoFirmante = usuario.rol === 'arbitro' ? 'arbitro' : 'vocal'
      await supabase.from('firmas_acta').insert({
        acta_id: actaId, firmante_tipo: tipoFirmante, firmante_id: usuario.id
      })

      toast.success('Partido finalizado. Esperando firma de capitanes.')
      setVista('lista')
    } catch (err) {
      console.error(err)
      toast.error('Error al finalizar')
    } finally {
      setGuardando(false)
    }
  }

  async function firmarActa() {
    setGuardando(true)
    try {
      let actaId = partidoSeleccionado.acta?.[0]?.id
      if (!actaId) throw new Error('No se encontró el acta')

      const esLocal = usuario.club_id === partidoSeleccionado.local.id
      const esVisitante = usuario.club_id === partidoSeleccionado.visitante.id

      if (!esLocal && !esVisitante) throw new Error('No perteneces a ninguno de los dos clubes')

      const tipoFirmante = esLocal ? 'capitan_local' : 'capitan_visitante'

      await supabase.from('firmas_acta').insert({
        acta_id: actaId, firmante_tipo: tipoFirmante, firmante_id: usuario.id
      })

      toast.success('Acta firmada correctamente. ¡Gracias, Capitán!')
      setVista('lista')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al firmar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando && vista === 'lista') return <div className="p-8 text-center">Cargando...</div>

  if (vista === 'lista') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-liga-azul">Actas y Planillas</h1>
          <p className="text-gray-500 text-sm">
            {esCapitan ? 'Partidos pendientes de tu firma' : 'Selecciona un partido para gestionar el acta'}
          </p>
        </div>

        {partidos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-2" />
            {esCapitan ? 'No hay actas pendientes de firma.' : 'No hay partidos pendientes.'}
          </div>
        ) : (
          <div className="space-y-3">
            {partidos.map(p => {
              const actaCerrada = p.acta?.[0]?.estado === 'cerrada'
              if (esCapitan && actaCerrada) return null

              return (
                <div key={p.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => seleccionarPartido(p)}>
                  <div className="flex-1 text-center sm:text-right font-bold text-gray-800">{p.local?.nombre}</div>
                  <div className="px-6 text-center">
                    <div className="text-xs text-gray-400 font-semibold mb-1">{p.fecha?.etapa?.nombre} - Fecha {p.fecha?.numero}</div>
                    <div className="text-lg font-bold text-liga-azul">VS</div>
                    {p.jugado && <div className="text-sm font-bold text-green-600">{p.goles_local} - {p.goles_visitante}</div>}
                  </div>
                  <div className="flex-1 text-center sm:text-left font-bold text-gray-800">{p.visitante?.nombre}</div>
                  <div className="mt-4 sm:mt-0 sm:ml-4">
                    <button className={`${esCapitan ? 'bg-liga-rojo hover:bg-liga-rojo/90' : 'bg-liga-azul hover:bg-liga-azul/90'} text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2`}>
                      {esCapitan ? <PenTool size={16} /> : <Users size={16} />} 
                      {esCapitan ? 'Firmar Acta' : 'Ingresar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (vista === 'firmar_acta') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
         <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
            <h2 className="text-xl font-bold text-liga-azul mb-2">Acta del Partido</h2>
            <p className="text-gray-600 mb-4">{partidoSeleccionado.local?.nombre} {marcador.local} - {marcador.visitante} {partidoSeleccionado.visitante?.nombre}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-bold text-gray-700 mb-3">Eventos Registrados</h3>
              {eventos.length === 0 ? <p className="text-sm text-gray-500">Sin eventos.</p> : (
                <ul className="space-y-2 text-sm">
                  {eventos.map((ev, i) => (
                    <li key={i} className="flex gap-2"><span className="font-bold">{ev.jugador}:</span> <span className="capitalize">{ev.tipo === 'amarilla' ? '🟨 Amarilla' : ev.tipo === 'roja' ? '🟥 Roja' : '⚽ Gol'}</span></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6 text-sm text-yellow-800">
              Al firmar, confirmas que estás de acuerdo con el marcador y los eventos registrados por el árbitro y vocal.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setVista('lista')} className="flex-1 py-2 border rounded font-semibold">Volver</button>
              <button onClick={firmarActa} disabled={guardando} className="flex-1 bg-green-600 text-white py-2 rounded font-semibold flex justify-center items-center gap-2">
                <PenTool size={18} /> Firmar Acta
              </button>
            </div>
         </div>
      </div>
    )
  }

  if (vista === 'planilla') {
    const titularesL = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesV = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresVisitante.some(j => j.id === id)).length

    return (
      <div className="max-w-6xl mx-auto pb-20">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setVista('lista')} className="text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"><ArrowLeft size={18} /> Volver</button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.local?.nombre} vs {partidoSeleccionado.visitante?.nombre}</h2>
            <p className="text-xs text-gray-500">Mínimo: {reglas.min_jugadores} titulares</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => guardarPlanilla(false)} disabled={guardando} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-300">Guardar</button>
            <button onClick={() => guardarPlanilla(true)} disabled={guardando} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 flex items-center gap-2">
              <Target size={18} /> Iniciar Partido
            </button>
          </div>
        </div>

        {(titularesL < reglas.min_jugadores || titularesV < reglas.min_jugadores) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <p className="text-sm text-red-700 font-semibold">Faltan titulares. No podrás iniciar el partido hasta cumplir el mínimo.</p>
          </div>
        )}

        <div className="flex gap-4 justify-center mb-6 text-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div> Titular</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div> Suplente</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-gray-300 rounded"></div> No convocado</div>
          <div className="flex items-center gap-2"><Lock size={16} className="text-red-500" /> Bloqueado</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[ { team: partidoSeleccionado.local, players: jugadoresLocal, tit: titularesL, isLocal: true },
             { team: partidoSeleccionado.visitante, players: jugadoresVisitante, tit: titularesV, isLocal: false } ].map((data, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`${data.isLocal ? 'bg-liga-azul' : 'bg-gray-700'} text-white p-3 flex justify-between px-4`}>
                <h3 className="font-bold">{data.team?.nombre}</h3>
                <span className={`text-sm font-bold ${data.tit < reglas.min_jugadores ? 'text-red-300' : 'text-green-300'}`}>{data.tit} / {reglas.min_jugadores}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {data.players.map(j => {
                  const estado = planilla[j.id]
                  const bloqueado = j.estado_carnet === 'BLOQUEADO'
                  return (
                    <div key={j.id} onClick={() => toggleJugador(j.id, data.isLocal)} className={`p-3 flex items-center justify-between cursor-pointer ${bloqueado ? 'bg-red-50 opacity-75 cursor-not-allowed' : estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold">{j.dorsal || '-'}</div>
                        <div>
                          <p className="font-semibold text-sm">{j.apellidos} {j.nombres}</p>
                          {bloqueado ? <p className="text-xs text-red-600">🔒 {j.motivos_bloqueo.join(', ')}</p> : <p className="text-xs text-gray-500">{j.codigo_interno}</p>}
                        </div>
                      </div>
                      {bloqueado ? <Lock className="text-red-500" size={20} /> : estado === 'titular' ? <CheckCircle className="text-green-500" size={20} /> : estado === 'suplente' ? <CheckCircle className="text-yellow-500" size={20} /> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-liga-azul">Partido en Curso</h1>
          <p className="text-sm text-gray-500">{partidoSeleccionado.fecha?.etapa?.nombre} - Fecha {partidoSeleccionado.fecha?.numero}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.local?.nombre}</h2>
            <div className="text-6xl font-bold text-liga-azul my-2">{marcador.local}</div>
            <button onClick={() => setModalAccion({ tipo: 'gol', equipo: 'local' })} className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-bold text-sm hover:bg-green-200 w-full mb-2">⚽ Gol Local</button>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'local', tipoTarjeta: 'amarilla' })} className="w-8 h-10 bg-yellow-400 rounded shadow text-xs font-bold flex items-center justify-center">A</button>
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'local', tipoTarjeta: 'roja' })} className="w-8 h-10 bg-red-600 rounded shadow text-xs font-bold text-white flex items-center justify-center">R</button>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-400 px-4">-</div>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.visitante?.nombre}</h2>
            <div className="text-6xl font-bold text-liga-azul my-2">{marcador.visitante}</div>
            <button onClick={() => setModalAccion({ tipo: 'gol', equipo: 'visitante' })} className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-bold text-sm hover:bg-green-200 w-full mb-2">⚽ Gol Visitante</button>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'visitante', tipoTarjeta: 'amarilla' })} className="w-8 h-10 bg-yellow-400 rounded shadow text-xs font-bold flex items-center justify-center">A</button>
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'visitante', tipoTarjeta: 'roja' })} className="w-8 h-10 bg-red-600 rounded shadow text-xs font-bold text-white flex items-center justify-center">R</button>
            </div>
          </div>
        </div>
      </div>

      <button onClick={finalizarPartido} disabled={guardando} className="w-full bg-liga-rojo text-white py-3 rounded-lg font-bold text-lg hover:bg-liga-rojo/90 flex items-center justify-center gap-2 mb-6 shadow-md">
        <StopCircle size={24} /> Finalizar Partido
      </button>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold text-gray-700 mb-3">Eventos del Partido</h3>
        {eventos.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No hay eventos registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {eventos.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                <span className="font-bold">{ev.jugador}</span>
                <span className="text-gray-400">-</span>
                <span className="capitalize">{ev.tipo === 'amarilla' ? '🟨 Tarjeta Amarilla' : ev.tipo === 'roja' ? '🟥 Tarjeta Roja' : '⚽ Gol'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAccion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {modalAccion.tipo === 'gol' ? '¿Quién hizo el Gol?' : `¿Quién recibió la ${modalAccion.tipoTarjeta === 'amarilla' ? 'Amarilla' : 'Roja'}?`}
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {(modalAccion.equipo === 'local' ? jugadoresLocal : jugadoresVisitante)
                .filter(j => planilla[j.id])
                .map(j => (
                <button key={j.id} onClick={() => registrarAccion(j.id)} className="w-full text-left p-2 border rounded hover:bg-gray-50 flex justify-between">
                  <span>{j.apellidos} {j.nombres}</span>
                  <span className="text-gray-400">#{j.dorsal}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setModalAccion(null)} className="w-full py-2 bg-gray-200 rounded font-semibold">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}