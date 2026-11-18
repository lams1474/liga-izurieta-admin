// src/components/CarnetImprimible.jsx
import carnetFondo from '../assets/carnet-fondo.png'
import selloLiga from '../assets/sello-liga.png'

export default function CarnetImprimible({ jugador }) {
  if (!jugador) return null

  const urlVerificacion = `https://web-liga-izurieta.vercel.app/verificar?cedula=${jugador.cedula}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlVerificacion)}`

  return (
    // Tamaño exacto: 8.5cm de ancho x 5.5cm de alto
    <div className="relative bg-blue-900 overflow-hidden" style={{ width: '8.5cm', height: '5.5cm' }}>
      <img src={carnetFondo} alt="Fondo" className="absolute inset-0 w-full h-full object-cover z-0" />
      
      {/* Foto (escalada proporcionalmente) */}
      <div className="absolute top-[24%] left-[4%] w-[21%] h-[40%] bg-gray-200 border border-white rounded shadow-md overflow-hidden z-10">
        {jugador.foto_url ? (
          <img src={jugador.foto_url} alt="Jugador" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold text-[6px] text-center p-1">SIN FOTO</div>
        )}
      </div>

      {/* Datos (escalados proporcionalmente) */}
      <div className="absolute top-[26%] left-[27%] right-[15%] z-10 bg-black/30 backdrop-blur-sm p-1 rounded-r-lg border-l-2 border-liga-amarillo shadow-lg">
        <h3 className="text-white font-bold text-[9px] leading-[1.1] mb-0.5 break-words" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {jugador.apellidos} {jugador.nombres}
        </h3>
        <p className="text-white text-[8px] font-mono mb-0.5">C.C. {jugador.cedula}</p>
        <p className="text-liga-amarillo text-[8px] font-bold truncate">CLUB: {jugador.equipo}</p>
      </div>

      {/* QR (escalado proporcionalmente) */}
      <div className="absolute bottom-[10%] left-[4%] z-10 bg-white p-0.5 rounded shadow-sm">
        <img src={qrUrl} alt="QR" className="w-[35px] h-[35px]" />
      </div>

      {/* Escudo (escalado proporcionalmente) */}
      <div className="absolute bottom-[10%] right-[5%] z-10 w-10 h-10 bg-white rounded-full p-0.5 flex items-center justify-center shadow-xl border-2 border-blue-900">
        {jugador.escudo_url ? (
          <img src={jugador.escudo_url} alt="Escudo" className="w-full h-full object-contain rounded-full" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-[6px]">{jugador.equipo?.substring(0, 3).toUpperCase()}</div>
        )}
      </div>

      {/* Sello (escalado proporcionalmente) */}
      <div className="absolute top-[5%] left-[3%] z-10 w-10 h-10 drop-shadow-lg">
        <img src={selloLiga} alt="Sello" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}