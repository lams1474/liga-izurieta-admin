import { useState, useEffect, useRef } from 'react'
import carnetFondo from '../assets/carnet-fondo.png'
import selloLiga from '../assets/sello-liga.png'

export default function CarnetDigitalCard({ jugador, equipo }) {
  const nombreEquipo = equipo?.nombre || 'SIN EQUIPO'
  const escudoUrl = equipo?.escudo_url

  const urlVerificacion = `https://web-liga-izurieta.vercel.app/verificar?cedula=${jugador?.cedula}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlVerificacion)}`

  // LÓGICA DE ESCALADO DINÁMICO
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth
        // Calcula cuánto achicar el carnet de 600px para que quepa en el contenedor
        setScale(Math.min(width / 600, 1))
      }
    }

    // Ejecutar al montar y al redimensionar
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    // Contenedor responsivo: ocupa el 100% del ancho (hasta 600px) y ajusta su altura
    <div
      ref={containerRef}
      className="w-full max-w-[600px] mx-auto overflow-hidden relative"
      style={{ height: `${400 * scale}px` }}
    >
      {/* EL CARNET ORIGINAL (Código intacto, mismas medidas 600x400) */}
      <div
        className="absolute top-0 left-0 w-[600px] h-[400px] bg-blue-900 rounded-2xl shadow-2xl overflow-hidden origin-top-left print:shadow-none print:rounded-none"
        style={{ transform: `scale(${scale})` }}
      >

        {/* 1. IMAGEN DE FONDO */}
        <img src={carnetFondo} alt="Fondo Carnet" className="absolute inset-0 w-full h-full object-cover z-0" />

        {/* 2. FOTO DEL JUGADOR */}
        <div className="absolute top-[24%] left-[4%] w-[21%] h-[40%] bg-gray-200 border-2 border-white rounded shadow-md overflow-hidden z-10">
          {jugador?.foto_url ? (
            <img src={jugador.foto_url} alt="Jugador" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold text-xs text-center p-1">
              SIN FOTO
            </div>
          )}
        </div>

        {/* 3. DATOS DEL JUGADOR (Cristal Esmerilado) */}
        <div className="absolute top-[22%] left-[27%] right-[15%] z-10 bg-black/30 backdrop-blur-sm p-3 rounded-r-lg border-l-4 border-liga-amarillo shadow-lg flex flex-col justify-center min-h-[100px]">
          <h3 className="text-white font-bold text-[16px] leading-[1.2] mb-1 drop-shadow-md break-words">
            {jugador?.apellidos} {jugador?.nombres}
          </h3>
          <p className="text-white text-sm font-mono mb-1 drop-shadow-md">
            C.C. {jugador?.cedula}
          </p>
          <p className="text-liga-amarillo text-sm font-bold drop-shadow-md">
            CLUB: {nombreEquipo}
          </p>
        </div>

        {/* 4. CÓDIGO QR (Mantenemos la API externa del admin) */}
        <div className="absolute bottom-[10%] left-[4%] z-10 bg-white p-1 rounded shadow-sm">
          <img src={qrUrl} alt="QR Verificación" className="w-[70px] h-[70px]" />
        </div>

        {/* 5. ESCUDO DEL CLUB */}
        <div className="absolute bottom-[10%] right-[5%] z-10 w-24 h-24 bg-white rounded-full p-1 flex items-center justify-center shadow-xl border-4 border-blue-900">
          {escudoUrl ? (
            <img src={escudoUrl} alt="Escudo Club" className="w-full h-full object-contain rounded-full" />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm text-center">
              {nombreEquipo.substring(0, 3).toUpperCase()}
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