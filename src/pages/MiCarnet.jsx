import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Printer, Loader } from 'lucide-react'

import carnetFondo from '../assets/carnet-fondo.png'
import selloLiga from '../assets/sello-liga.png'

export default function MiCarnet() {
  const { usuario } = useAuth()
  const [carnet, setCarnet] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!usuario) return

      try {
        let { data, error } = await supabase
          .from('vista_carnet_jugador')
          .select('*')
          .eq('jugador_id', usuario.id)
          .maybeSingle()

        // Fallback para pruebas con el Admin
        if (!data) {
          const { data: fallback } = await supabase
            .from('vista_carnet_jugador')
            .select('*')
            .eq('cedula', '0502067739')
            .maybeSingle()
          data = fallback
        }

        if (error) throw error
        setCarnet(data)
      } catch (err) {
        console.error(err)
        setError('No se pudo cargar el carnet')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [usuario])

  function imprimirCarnet() {
    window.print()
  }

  if (cargando) return <div className="min-h-screen flex items-center justify-center bg-liga-azul text-white"><Loader className="animate-spin" size={40} /></div>

  if (error || !carnet) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Carnet no disponible</h2>
        <p className="text-gray-600">{error || 'No se encontró un jugador registrado.'}</p>
      </div>
    </div>
  )

  const urlVerificacion = `https://web-liga-izurieta.vercel.app/verificar?cedula=${carnet.cedula}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlVerificacion)}`

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center p-4 print:p-0 print:bg-white">

      <div className="mb-6 print:hidden">
        <button
          onClick={imprimirCarnet}
          className="bg-liga-azul text-white px-6 py-3 rounded-md font-bold text-lg hover:bg-liga-azul/90 flex items-center gap-2 shadow-lg"
        >
          <Printer size={22} /> Imprimir Carnet
        </button>
      </div>

      {/* CONTENEDOR DEL CARNET */}
      <div className="relative w-[600px] h-[400px] bg-blue-900 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">

        {/* 1. IMAGEN DE FONDO */}
        <img src={carnetFondo} alt="Fondo Carnet" className="absolute inset-0 w-full h-full object-cover z-0" />

        {/* 2. FOTO DEL JUGADOR */}
        <div className="absolute top-[24%] left-[4%] w-[21%] h-[40%] bg-gray-200 border-2 border-white rounded shadow-md overflow-hidden z-10">
          {carnet.foto_url ? (
            <img src={carnet.foto_url} alt="Jugador" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold text-xs text-center p-1">
              SIN FOTO
            </div>
          )}
        </div>

        {/* 3. DATOS DEL JUGADOR (Diseño de Cristal Esmerilado) */}
        <div className="absolute top-[26%] left-[27%] right-[15%] z-10 bg-black/30 backdrop-blur-sm p-3 rounded-r-lg border-l-4 border-liga-amarillo shadow-lg">
          <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
            {carnet.apellidos} {carnet.nombres}
          </h3>
          <p className="text-white text-sm font-mono mb-1 drop-shadow-md">
            C.C. {carnet.cedula}
          </p>
          <p className="text-liga-amarillo text-sm font-bold drop-shadow-md">
            CLUB: {carnet.equipo}
          </p>
        </div>

        {/* 4. CÓDIGO QR (Abajo a la Izquierda) */}
        <div className="absolute bottom-[10%] left-[4%] z-10 bg-white p-1 rounded shadow-sm">
          <img
            src={qrUrl}
            alt="QR Verificación"
            className="w-[70px] h-[70px]"
          />
        </div>

        {/* 5. ESCUDO DEL CLUB (Más grande y con borde) */}
        <div className="absolute bottom-[10%] right-[5%] z-10 w-24 h-24 bg-white rounded-full p-1 flex items-center justify-center shadow-xl border-4 border-blue-900">
          {carnet.escudo_url ? (
            <img src={carnet.escudo_url} alt="Escudo Club" className="w-full h-full object-contain rounded-full" />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm text-center">
              {carnet.equipo?.substring(0, 3).toUpperCase()}
            </div>
          )}
        </div>

        {/* 6. SELLO DE LA LIGA */}
        <div className="absolute top-[5%] left-[3%] z-10 w-24 h-24 drop-shadow-lg">
          <img src={selloLiga} alt="Sello Liga" className="w-full h-full object-contain" />
        </div>

      </div>
    </div>
  )
}