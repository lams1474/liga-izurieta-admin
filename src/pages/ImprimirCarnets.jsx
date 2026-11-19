import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReactToPrint } from 'react-to-print'
import { Printer, Loader, CheckSquare, Square } from 'lucide-react'
import CarnetImprimible from '../components/CarnetImprimible'

export default function ImprimirCarnets() {
  const [equipos, setEquipos] = useState([])
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('')
  const [jugadores, setJugadores] = useState([])
  const [seleccionados, setSeleccionados] = useState([])
  const [cargando, setCargando] = useState(true)
  const printRef = useRef(null)

  // 1. Cargar lista de equipos
  useEffect(() => {
    async function cargarEquipos() {
      const { data } = await supabase.from('equipos').select('id, nombre').eq('activo', true).order('nombre')
      if (data) {
        setEquipos(data)
        if (data.length > 0) setEquipoSeleccionado(data[0].id)
      }
      setCargando(false)
    }
    cargarEquipos()
  }, [])

  // 2. Cargar jugadores del equipo seleccionado
  useEffect(() => {
    if (!equipoSeleccionado) return

    async function cargarJugadores() {
      setCargando(true)
      const { data } = await supabase
        .from('vista_carnet_jugador')
        .select('*')
        .eq('equipo_id', equipoSeleccionado)
        .order('apellidos', { ascending: true })
      
      if (data) {
        setJugadores(data)
        setSeleccionados(data.map(j => j.jugador_id))
      } else {
        setJugadores([])
        setSeleccionados([])
      }
      setCargando(false)
    }
    cargarJugadores()
  }, [equipoSeleccionado])

  // 3. Manejar la selección de jugadores
  const toggleSeleccion = (jugadorId) => {
    setSeleccionados(prev => 
      prev.includes(jugadorId) 
        ? prev.filter(id => id !== jugadorId) 
        : [...prev, jugadorId]
    )
  }

  const toggleTodos = () => {
    if (seleccionados.length === jugadores.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(jugadores.map(j => j.jugador_id))
    }
  }

  // 4. Filtrar jugadores a imprimir
  const jugadoresAImprimir = jugadores.filter(j => seleccionados.includes(j.jugador_id))

  // 5. Configurar impresión (SIN onBeforePrint para evitar el error .then)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Carnets - ${equipos.find(e => e.id === equipoSeleccionado)?.nombre || 'Liga'}`,
    onAfterPrint: () => console.log("Impresión finalizada"),
    onPrintError: (error) => console.error("Error de impresión:", error),
  })

  if (cargando) return <div className="p-8 text-center"><Loader className="animate-spin mx-auto" /></div>

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-liga-azul">Imprimir Carnets</h1>
          <p className="text-gray-500 text-sm">Selecciona el club y los jugadores</p>
        </div>
        <button 
          onClick={handlePrint} 
          disabled={jugadoresAImprimir.length === 0}
          className="bg-liga-azul text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-blue-800 disabled:opacity-50"
        >
          <Printer size={20} /> Imprimir {jugadoresAImprimir.length} Carnets
        </button>
      </div>

      {/* Selector de Equipo y Lista de Jugadores */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 print:hidden">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Selecciona el Club</label>
          <select
            value={equipoSeleccionado}
            onChange={(e) => setEquipoSeleccionado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="">Seleccione un club...</option>
            {equipos.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-700">Jugadores ({jugadores.length})</p>
          <button onClick={toggleTodos} className="text-xs text-liga-azul font-semibold underline">
            {seleccionados.length === jugadores.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-2 rounded-md">
          {jugadores.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">No hay jugadores registrados en este club.</p>
          ) : (
            jugadores.map(j => (
              <button
                key={j.jugador_id}
                onClick={() => toggleSeleccion(j.jugador_id)}
                className={`flex items-center gap-2 p-2 rounded-md border text-left text-sm transition-colors ${seleccionados.includes(j.jugador_id) ? 'bg-blue-50 border-liga-azul text-liga-azul font-bold' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >
                {seleccionados.includes(j.jugador_id) ? <CheckSquare size={16} /> : <Square size={16} />}
                <span className="truncate">{j.apellidos} {j.nombres}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CONTENEDOR DE IMPRESIÓN (Oculto fuera de pantalla para que react-to-print lo capture) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={printRef}>
          <style>
            {`
              @media print {
                @page { 
                  size: A4 portrait;
                  margin: 0; /* Eliminamos márgenes de la página para que no reste espacio */
                }
                body {
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-container {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 2mm;
                  width: 100%;
                  height: 100%;
                  justify-items: center;
                  align-items: center;
                  padding: 5mm; /* Margen interno controlado */
                }
                .carnet-item {
                  page-break-inside: avoid;
                  width: 8.5cm !important;
                  height: 5.5cm !important;
                  /* Forzar que el navegador no reduzca el tamaño */
                  transform: scale(1) !important;
                  transform-origin: top left;
                }
                .carnet-item > div {
                  width: 8.5cm !important;
                  height: 5.5cm !important;
                }
              }
            `}
          </style>
          
          <div className="print-container">
            {jugadoresAImprimir.map((jugador) => (
              <div key={jugador.jugador_id} className="carnet-item">
                <CarnetImprimible jugador={jugador} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}