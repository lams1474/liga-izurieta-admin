import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Printer, AlertTriangle, CheckCircle } from 'lucide-react'
import escudoLiga from '../assets/escudo-liga.png'

export default function MiCarnet() {
  const { usuario } = useAuth()
  
  const [cargando, setCargando] = useState(true)
  const [carnet, setCarnet] = useState(null)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(true)

  const carnetRef = useRef(null)

  useEffect(() => {
    async function cargarCarnet() {
      if (!usuario) return

      try {
        // Buscar al jugador vinculado a este usuario
        const { data, error: dbError } = await supabase
          .from('vista_carnet_jugador')
          .select('*')
          .eq('jugador_id', usuario.id)
          .maybeSingle()

        if (dbError) throw dbError

        if (!data) {
           const { data: jugadorData, error: dbError2 } = await supabase
            .from('vista_carnet_jugador')
            .select('*')
            .limit(1)
            .maybeSingle()
           
           if (dbError2) throw dbError2

           if (jugadorData) {
             setCarnet(jugadorData)
           } else {
             setError('No se encontró información de carnet para este usuario.')
           }
        } else {
          setCarnet(data)
        }
      } catch (err) {
        console.error(err)
        setError('Error al conectar con la base de datos del carnet')
      } finally {
        setCargando(false)
      }
    }
    cargarCarnet()
  }, [usuario])

  function imprimirCarnet() {
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html>
        <head>
          <title>Imprimir Carnet</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0; }
            .carnet-container { width: 400px; height: 250px; transform: scale(1.5); }
            img { max-width: 100%; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>
          ${carnetRef.current.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    ventana.document.close()
  }

  if (cargando) return <div className="p-8 text-center">Cargando carnet...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-liga-azul">Mi Carnet Digital</h1>
        <button 
          onClick={() => setModalAbierto(true)} 
          className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2"
        >
          Ver Carnet
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-2" />
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      ) : carnet ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-4 border-b pb-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {carnet.foto_url ? (
                <img src={carnet.foto_url} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-400">{carnet.nombres?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{carnet.apellidos} {carnet.nombres}</h2>
              <p className="text-sm text-gray-500">C.C. {carnet.cedula}</p>
              <p className="text-sm text-gray-500">{carnet.equipo} ({carnet.disciplina} · {carnet.categoria})</p>
            </div>
            <div className="ml-auto">
              {carnet.estado_carnet === 'HABILITADO' ? (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle size={16}/> HABILITADO</span>
              ) : (
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"><X size={16}/> BLOQUEADO</span>
              )}
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm">Haz clic en "Ver Carnet" para abrir el diseño oficial.</p>
        </div>
      ) : null}

      {modalAbierto && carnet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-liga-azul">Carnet Digital Oficial</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="p-6 flex justify-center bg-gray-100">
              <div 
                ref={carnetRef} 
                className="relative w-[400px] h-[250px] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 rounded-xl shadow-lg overflow-hidden border border-gray-300"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="absolute top-0 right-0 w-32 h-full bg-red-600 transform skew-x-[-20deg] translate-x-10"></div>
                <div className="absolute top-0 right-0 w-8 h-full bg-yellow-400 transform skew-x-[-20deg] translate-x-10"></div>

                <div className="absolute top-4 left-0 right-0 text-center z-10 px-4">
                  <h2 className="text-white font-bold text-sm tracking-wider leading-tight text-shadow">
                    LIGA DEPORTIVA BARRIAL<br/>JOSÉ IGNACIO IZURIETA
                  </h2>
                </div>

                <div className="absolute top-16 left-4 w-24 h-28 bg-gray-200 border-2 border-white rounded-md overflow-hidden shadow-md z-10">
                  {carnet.foto_url ? (
                    <img src={carnet.foto_url} alt="Jugador" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                      {carnet.nombres?.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="absolute top-[85px] left-32 right-4 z-10">
                  <h3 className="text-white font-bold text-sm leading-tight mb-1">{carnet.apellidos} {carnet.nombres}</h3>
                  <p className="text-white text-xs font-mono mb-1">C.C. {carnet.cedula}</p>
                  <p className="text-white text-xs font-bold">CLUB: {carnet.equipo}</p>
                </div>

                <div className="absolute bottom-4 left-4 z-10 flex flex-col items-center">
                  <img src={carnet.firma_presidente || 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Signature_of_John_Hancock.svg'} alt="Firma" className="h-8 object-contain opacity-80 mb-1" />
                  {/* cSpell:ignore Maigua */}
                  <p className="text-yellow-400 font-bold text-xs">Luis Maigua</p>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white p-1 rounded-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${carnet.token_carnet}`} 
                    alt="QR" 
                    className="w-[70px] h-[70px]"
                  />
                </div>

                <div className="absolute bottom-4 right-4 z-10 w-16 h-16 bg-white rounded-full p-1 flex items-center justify-center shadow-md">
                  {carnet.escudo_url ? (
                    <img src={carnet.escudo_url} alt="Escudo Club" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[10px]">
                      {carnet.equipo?.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="absolute top-2 right-2 opacity-30 w-12 h-12 z-0">
                  <img src={escudoLiga} alt="Liga" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-between bg-gray-50">
              <button 
                onClick={imprimirCarnet}
                className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2"
              >
                <Printer size={18} /> Imprimir Carnet
              </button>
              <button 
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}