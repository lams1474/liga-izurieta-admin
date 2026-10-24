import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext' // <-- Importado para saber el rol
import { Calendar, Plus, Clock, MapPin, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Calendario() {
  const { usuario } = useAuth()
  // Validamos si el usuario tiene permisos de administración
  const esAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria'

  const [etapas, setEtapas] = useState([])
  const [fechas, setFechas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [equipos, setEquipos] = useState([])
  const [arbitros, setArbitros] = useState([])

  const [etapaSeleccionada, setEtapaSeleccionada] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')

  const [cargando, setCargando] = useState(true)

  // Modales
  const [modalEtapa, setModalEtapa] = useState(false)
  const [modalFecha, setModalFecha] = useState(false)
  const [modalPartido, setModalPartido] = useState(false)

  // Formularios
  const [formEtapa, setFormEtapa] = useState({ nombre: '', disciplina: 'futbol', categoria: 'hombres', fecha_inicio: '', fecha_fin: '' })
  const [formFecha, setFormFecha] = useState({ numero: '', fecha_inicio: '', fecha_fin: '' })
  const [formPartido, setFormPartido] = useState({ hora: '', cancha: '', equipo_local_id: '', equipo_visitante_id: '', arbitro_id: '' })
  
  // Estado para saber si estamos editando un partido
  const [partidoEditando, setPartidoEditando] = useState(null)

  // Cargar datos iniciales
  useEffect(() => {
    async function cargarInicial() {
      const { data: eq } = await supabase.from('equipos').select('id, nombre, disciplina, categoria').eq('activo', true).order('nombre')
      const { data: arb } = await supabase.from('arbitros').select('id, nombres, apellidos').eq('activo', true).order('apellidos')
      const { data: et } = await supabase.from('etapas').select('*').order('fecha_inicio', { ascending: false })

      setEquipos(eq || [])
      setArbitros(arb || [])
      setEtapas(et || [])
      
      if (et && et.length > 0) {
        setEtapaSeleccionada(et[0].id)
      }
      setCargando(false)
    }
    cargarInicial()
  }, [])

  // Cargar fechas cuando cambia la etapa
  useEffect(() => {
    async function cargarFechas() {
      if (!etapaSeleccionada) {
        setFechas([])
        setFechaSeleccionada('')
        return
      }
      const { data } = await supabase.from('fechas').select('*').eq('etapa_id', etapaSeleccionada).order('numero')
      setFechas(data || [])
      
      if (data && data.length > 0) {
        setFechaSeleccionada(data[0].id)
      } else {
        setFechaSeleccionada('')
      }
    }
    cargarFechas()
  }, [etapaSeleccionada])

  // Cargar partidos cuando cambia la fecha
  useEffect(() => {
    async function cargarPartidos() {
      if (!fechaSeleccionada) {
        setPartidos([])
        return
      }
      const { data } = await supabase
        .from('partidos')
        .select(`
          id, hora, cancha, jugado, goles_local, goles_visitante,
          local:equipos!partidos_equipo_local_id_fkey (id, nombre),
          visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre),
          arbitro:arbitros (id, nombres, apellidos)
        `)
        .eq('fecha_id', fechaSeleccionada)
        .order('hora')
      setPartidos(data || [])
    }
    cargarPartidos()
  }, [fechaSeleccionada])

  // === CREAR ETAPA ===
  async function crearEtapa(e) {
    e.preventDefault()
    if (!formEtapa.nombre || !formEtapa.fecha_inicio || !formEtapa.fecha_fin) return toast.error('Llena los campos obligatorios')

    const { data, error } = await supabase.from('etapas').insert({
      nombre: formEtapa.nombre,
      disciplina: formEtapa.disciplina,
      categoria: formEtapa.categoria,
      fecha_inicio: formEtapa.fecha_inicio,
      fecha_fin: formEtapa.fecha_fin,
      activa: true
    }).select().single()

    if (error) return toast.error(error.message)
    
    toast.success('Etapa creada')
    setEtapas([data, ...etapas])
    setEtapaSeleccionada(data.id)
    setModalEtapa(false)
    setFormEtapa({ nombre: '', disciplina: 'futbol', categoria: 'hombres', fecha_inicio: '', fecha_fin: '' })
  }

  // === CREAR FECHA ===
  async function crearFecha(e) {
    e.preventDefault()
    if (!formFecha.numero || !formFecha.fecha_inicio) return toast.error('Llena los campos obligatorios')

    const { data, error } = await supabase.from('fechas').insert({
      etapa_id: etapaSeleccionada,
      numero: parseInt(formFecha.numero),
      fecha_inicio: formFecha.fecha_inicio,
      fecha_fin: formFecha.fecha_fin || formFecha.fecha_inicio,
      activa: true
    }).select().single()

    if (error) return toast.error(error.message)

    toast.success('Fecha creada')
    setFechas([...fechas, data].sort((a,b) => a.numero - b.numero))
    setFechaSeleccionada(data.id)
    setModalFecha(false)
    setFormFecha({ numero: '', fecha_inicio: '', fecha_fin: '' })
  }

  // === GUARDAR PARTIDO (Crear o Editar) ===
  async function guardarPartido(e) {
    e.preventDefault()
    if (!formPartido.equipo_local_id || !formPartido.equipo_visitante_id) return toast.error('Selecciona los equipos')
    if (formPartido.equipo_local_id === formPartido.equipo_visitante_id) return toast.error('Un equipo no puede jugar contra sí mismo')

    const payload = {
      hora: formPartido.hora || null,
      cancha: formPartido.cancha || null,
      equipo_local_id: formPartido.equipo_local_id,
      equipo_visitante_id: formPartido.equipo_visitante_id,
      arbitro_id: formPartido.arbitro_id || null,
    }

    if (partidoEditando) {
      // Actualizar partido existente
      const { data, error } = await supabase.from('partidos').update(payload).eq('id', partidoEditando.id)
        .select(`
          id, hora, cancha, jugado, goles_local, goles_visitante,
          local:equipos!partidos_equipo_local_id_fkey (id, nombre),
          visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre),
          arbitro:arbitros (id, nombres, apellidos)
        `).single()

      if (error) return toast.error(error.message)

      toast.success('Partido actualizado')
      setPartidos(partidos.map(p => p.id === data.id ? data : p).sort((a,b) => (a.hora || '').localeCompare(b.hora || '')))
    } else {
      // Crear nuevo partido
      const { data, error } = await supabase.from('partidos').insert({
        ...payload,
        fecha_id: fechaSeleccionada,
        jugado: false
      }).select(`
        id, hora, cancha, jugado, goles_local, goles_visitante,
        local:equipos!partidos_equipo_local_id_fkey (id, nombre),
        visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre),
        arbitro:arbitros (id, nombres, apellidos)
      `).single()

      if (error) return toast.error(error.message)

      toast.success('Partido programado')
      setPartidos([...partidos, data].sort((a,b) => (a.hora || '').localeCompare(b.hora || '')))
    }

    setModalPartido(false)
    setPartidoEditando(null)
    setFormPartido({ hora: '', cancha: '', equipo_local_id: '', equipo_visitante_id: '', arbitro_id: '' })
  }

  // === ELIMINAR PARTIDO ===
  async function eliminarPartido(id) {
    if (!window.confirm('¿Estás seguro de eliminar este partido? Esta acción no se puede deshacer.')) return

    const { error } = await supabase.from('partidos').delete().eq('id', id)
    if (error) return toast.error(error.message)

    toast.success('Partido eliminado')
    setPartidos(partidos.filter(p => p.id !== id))
  }

  // Filtrar equipos por la categoría/disciplina de la etapa seleccionada
  const etapaActual = etapas.find(e => e.id === etapaSeleccionada)
  const equiposFiltrados = equipos.filter(e => 
    !etapaActual || (e.disciplina === etapaActual.disciplina && e.categoria === etapaActual.categoria)
  )

  if (cargando) return <div className="p-8 text-center">Cargando calendario...</div>

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-liga-azul">Calendario y Partidos</h1>
          <p className="text-sm text-gray-500">Programa las jornadas del campeonato</p>
        </div>
        {/* SOLO ADMIN PUEDE CREAR ETAPAS */}
        {esAdmin && (
          <button
            onClick={() => setModalEtapa(true)}
            className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2"
          >
            <Plus size={18} /> Nueva Etapa
          </button>
        )}
      </div>

      {/* Selectores */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Etapa</label>
          <select
            value={etapaSeleccionada}
            onChange={(e) => setEtapaSeleccionada(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Selecciona Etapa</option>
            {etapas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} ({e.disciplina} - {e.categoria})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha (Jornada)</label>
          <div className="flex gap-2">
            <select
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={!etapaSeleccionada}
            >
              <option value="">Selecciona Fecha</option>
              {fechas.map(f => (
                <option key={f.id} value={f.id}>Fecha {f.numero} ({new Date(f.fecha_inicio + 'T00:00:00').toLocaleDateString()})</option>
              ))}
            </select>
            {/* SOLO ADMIN PUEDE AÑADIR FECHAS */}
            {esAdmin && (
              <button
                onClick={() => setModalFecha(true)}
                disabled={!etapaSeleccionada}
                className="bg-gray-200 text-gray-700 px-3 rounded-md hover:bg-gray-300 disabled:opacity-50"
                title="Añadir Fecha"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Partidos */}
      {fechaSeleccionada ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-liga-azul text-white p-4 flex justify-between items-center">
            <h3 className="font-bold">Partidos Programados</h3>
            {/* SOLO ADMIN PUEDE PROGRAMAR PARTIDOS */}
            {esAdmin && (
              <button
                onClick={() => {
                  setPartidoEditando(null)
                  setFormPartido({ hora: '', cancha: '', equipo_local_id: '', equipo_visitante_id: '', arbitro_id: '' })
                  setModalPartido(true)
                }}
                className="bg-liga-rojo text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-liga-rojo/90 flex items-center gap-1"
              >
                <Plus size={16} /> Programar Partido
              </button>
            )}
          </div>

          {partidos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay partidos en esta fecha.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {partidos.map(p => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-50 gap-4">
                  <div className="flex-1 text-center sm:text-right font-semibold text-gray-700">
                    {p.local?.nombre}
                  </div>
                  
                  <div className="flex flex-col items-center px-4">
                    {p.jugado ? (
                      <div className="text-2xl font-bold text-liga-azul">{p.goles_local} - {p.goles_visitante}</div>
                    ) : (
                      <div className="text-xl font-bold text-gray-300">VS</div>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1"><Clock size={12}/> {p.hora?.slice(0,5) || '--:--'}</span>
                      <span className="flex items-center gap-1"><MapPin size={12}/> {p.cancha || 'Sin cancha'}</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left font-semibold text-gray-700">
                    {p.visitante?.nombre}
                  </div>

                  {/* BOTONES DE ACCIÓN (SOLO ADMIN) */}
                  {esAdmin && (
                    <div className="flex items-center gap-1 sm:ml-4">
                      <button
                        onClick={() => {
                          setPartidoEditando(p)
                          setFormPartido({
                            hora: p.hora || '',
                            cancha: p.cancha || '',
                            equipo_local_id: p.local?.id || '',
                            equipo_visitante_id: p.visitante?.id || '',
                            arbitro_id: p.arbitro?.id || ''
                          })
                          setModalPartido(true)
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar partido"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => eliminarPartido(p.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar partido"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-8 bg-white rounded-lg shadow-md text-gray-500">
          <Calendar size={48} className="mx-auto text-gray-300 mb-2" />
          Selecciona una etapa y una fecha para ver los partidos.
        </div>
      )}

      {/* ================= MODAL ETAPA ================= */}
      {modalEtapa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={crearEtapa} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Nueva Etapa</h3>
            <div className="space-y-3">
              <input required type="text" placeholder="Nombre (Ej: Primera Etapa 2026)" className="w-full px-3 py-2 border rounded" value={formEtapa.nombre} onChange={e => setFormEtapa({...formEtapa, nombre: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <select className="w-full px-3 py-2 border rounded" value={formEtapa.disciplina} onChange={e => setFormEtapa({...formEtapa, disciplina: e.target.value})}>
                  <option value="futbol">Fútbol</option>
                  <option value="futsala">Futsala</option>
                  <option value="ecuavoly">Ecuavoly</option>
                </select>
                <select className="w-full px-3 py-2 border rounded" value={formEtapa.categoria} onChange={e => setFormEtapa({...formEtapa, categoria: e.target.value})}>
                  <option value="hombres">Hombres</option>
                  <option value="mujeres">Mujeres</option>
                  <option value="sub12">Sub-12</option>
                  <option value="master40">Master 40</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Inicio</label>
                  <input required type="date" className="w-full px-3 py-2 border rounded" value={formEtapa.fecha_inicio} onChange={e => setFormEtapa({...formEtapa, fecha_inicio: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fin</label>
                  <input required type="date" className="w-full px-3 py-2 border rounded" value={formEtapa.fecha_fin} onChange={e => setFormEtapa({...formEtapa, fecha_fin: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setModalEtapa(false)} className="flex-1 py-2 border rounded">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-liga-azul text-white rounded">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL FECHA ================= */}
      {modalFecha && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={crearFecha} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4">Nueva Fecha (Jornada)</h3>
            <div className="space-y-3">
              <input required type="number" placeholder="Número de Fecha (Ej: 1)" className="w-full px-3 py-2 border rounded" value={formFecha.numero} onChange={e => setFormFecha({...formFecha, numero: e.target.value})} />
              <div>
                <label className="text-xs text-gray-500">Fecha Inicio</label>
                <input required type="date" className="w-full px-3 py-2 border rounded" value={formFecha.fecha_inicio} onChange={e => setFormFecha({...formFecha, fecha_inicio: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Fecha Fin (Opcional)</label>
                <input type="date" className="w-full px-3 py-2 border rounded" value={formFecha.fecha_fin} onChange={e => setFormFecha({...formFecha, fecha_fin: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setModalFecha(false)} className="flex-1 py-2 border rounded">Cancelar</button>
              <button type="submit" className="flex-1 py-2 bg-liga-azul text-white rounded">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL PARTIDO (CREAR / EDITAR) ================= */}
      {modalPartido && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={guardarPartido} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">
              {partidoEditando ? 'Editar Partido' : 'Programar Partido'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Equipo Local</label>
                <select required className="w-full px-3 py-2 border rounded" value={formPartido.equipo_local_id} onChange={e => setFormPartido({...formPartido, equipo_local_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {equiposFiltrados.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Equipo Visitante</label>
                <select required className="w-full px-3 py-2 border rounded" value={formPartido.equipo_visitante_id} onChange={e => setFormPartido({...formPartido, equipo_visitante_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {equiposFiltrados.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Hora</label>
                  <input type="time" className="w-full px-3 py-2 border rounded" value={formPartido.hora} onChange={e => setFormPartido({...formPartido, hora: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cancha</label>
                  <input type="text" placeholder="Ej: Estadio Central" className="w-full px-3 py-2 border rounded" value={formPartido.cancha} onChange={e => setFormPartido({...formPartido, cancha: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Árbitro (Opcional)</label>
                <select className="w-full px-3 py-2 border rounded" value={formPartido.arbitro_id} onChange={e => setFormPartido({...formPartido, arbitro_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {arbitros.map(a => <option key={a.id} value={a.id}>{a.apellidos} {a.nombres}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button 
                type="button" 
                onClick={() => {
                  setModalPartido(false)
                  setPartidoEditando(null)
                }} 
                className="flex-1 py-2 border rounded"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2 bg-liga-azul text-white rounded">
                {partidoEditando ? 'Guardar Cambios' : 'Programar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}