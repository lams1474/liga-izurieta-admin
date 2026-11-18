// src/pages/ImprimirCarnets.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useReactToPrint } from 'react-to-print'
import { Printer, Loader } from 'lucide-react'
import CarnetImprimible from '../components/CarnetImprimible'

export default function ImprimirCarnets() {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const printRef = useRef(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('vista_carnet_jugador')
        .select('*')
        .order('apellidos', { ascending: true })
        .limit(10)
      
      if (data) setJugadores(data)
      if (error) console.error(error)
      setCargando(false)
    }
    cargar()
  }, [])

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Carnets Liga Izurieta',
    copyStyles: true,
  })

  if (cargando) return <div className="p-8 text-center"><Loader className="animate-spin mx-auto" /></div>

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-6 flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-bold text-liga-azul">Imprimir Carnets</h1>
        <button onClick={handlePrint} className="bg-liga-azul text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-blue-800">
          <Printer size={20} /> Imprimir Hoja A4
        </button>
      </div>

      {/* CONTENEDOR DE IMPRESIÓN */}
      <div ref={printRef} className="hidden print:block">
        <style>
          {`
            @media print {
              @page { 
                size: A4; 
                margin: 5mm; /* Márgenes de la hoja */
              }
              .print-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr); /* 2 columnas */
                grid-template-rows: repeat(5, 1fr);    /* 5 filas */
                gap: 2mm; /* Espacio entre carnets */
                width: 100%;
                height: 100%;
                justify-items: center;
                align-items: center;
              }
              .carnet-item {
                page-break-inside: avoid; /* Evita que un carnet se corte */
              }
            }
          `}
        </style>
        
        <div className="print-container">
          {jugadores.map((jugador) => (
            <div key={jugador.jugador_id} className="carnet-item">
              <CarnetImprimible jugador={jugador} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}