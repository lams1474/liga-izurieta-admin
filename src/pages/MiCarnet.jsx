import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Printer, AlertTriangle, CheckCircle } from 'lucide-react'

// IMPORTAMOS TU IMAGEN DE FONDO
import carnetFondo from '../assets/carnet-fondo.png'

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
            .carnet-container { width: 600px; height: 400px; transform: scale(1.5); }
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

      {/* MODAL DEL CARNET */}
      {modalAbierto && carnet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
            
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-liga-azul">Carnet Digital Oficial</h3>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>

            {/* Contenedor del Carnet */}
            <div className="p-6 flex justify-center bg-gray-100">
              <div 
                ref={carnetRef} 
                className="relative w-[600px] h-[400px] bg-blue-900 rounded-xl shadow-lg overflow-hidden"
              >
                {/* 1. IMAGEN DE FONDO (La que subiste) */}
                <img src={carnetFondo} alt="Fondo Carnet" className="absolute inset-0 w-full h-full object-cover" />

                {/* 2. FOTO DEL JUGADOR (Izquierda) */}
                <div className="absolute top-[25%] left-[5%] w-[22%] h-[40%] bg-gray-200 border-2 border-white rounded-md overflow-hidden shadow-lg z-10">
                  {carnet.foto_url ? (
                    <img src={carnet.foto_url} alt="Jugador" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold">
                      {carnet.nombres?.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 3. DATOS DEL JUGADOR (Al centro, evitando la firma) */}
                <div className="absolute top-[30%] left-[32%] right-[15%] z-10">
                  <h3 className="text-white font-bold text-xl leading-tight mb-2 text-shadow">
                    {carnet.apellidos} {carnet.nombres}
                  </h3>
                  <p className="text-white text-base font-mono mb-1 text-shadow">
                    C.C. {carnet.cedula}
                  </p>
                  <p className="text-white text-base font-bold text-shadow">
                    CLUB: {carnet.equipo}
                  </p>
                </div>

                {/* 4. CÓDIGO QR (Abajo a la Izquierda) */}
                <div className="absolute bottom-[10%] left-[5%] z-10 bg-white p-1.5 rounded-md shadow-md">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${carnet.token_carnet}`} 
                    alt="QR" 
                    className="w-[80px] h-[80px]"
                  />
                </div>

                {/* 5. ESCUDO DEL CLUB (Abajo a la Derecha) */}
                <div className="absolute bottom-[10%] right-[8%] z-10 w-20 h-20 bg-white/90 rounded-full p-1 flex items-center justify-center shadow-lg border-2 border-liga-azul">
                  {carnet.escudo_url ? (
                    <img src={carnet.escudo_url} alt="Escudo Club" className="w-full h-full object-contain rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-xs">
                      {carnet.equipo?.substring(0, 3).toUpperCase()}
                    </div>
                  )}
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