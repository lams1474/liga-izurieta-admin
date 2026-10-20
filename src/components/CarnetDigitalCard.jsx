import carnetFondo from '../assets/carnet-fondo.png'
import selloLiga from '../assets/sello-liga.png'

export default function CarnetDigitalCard({ jugador, equipo }) {
  // Generamos la URL para el QR que apunta a la web pública
  const urlVerificacion = `https://web-liga-izurieta.vercel.app/verificar?cedula=${jugador?.cedula}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlVerificacion)}`

  return (
    <div className="relative w-[600px] h-[400px] bg-blue-900 rounded-2xl shadow-2xl overflow-hidden mx-auto print:shadow-none print:rounded-none">
      
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

      {/* 3. DATOS DEL JUGADOR (Cristal) */}
      <div className="absolute top-[26%] left-[27%] right-[15%] z-10 bg-black/30 backdrop-blur-sm p-3 rounded-r-lg border-l-4 border-liga-amarillo shadow-lg">
        <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
          {jugador?.apellidos} {jugador?.nombres}
        </h3>
        <p className="text-white text-sm font-mono mb-1 drop-shadow-md">
          C.C. {jugador?.cedula}
        </p>
        <p className="text-liga-amarillo text-sm font-bold drop-shadow-md">
          CLUB: {equipo?.nombre || 'SIN EQUIPO'}
        </p>
      </div>

      {/* 4. CÓDIGO QR */}
      <div className="absolute bottom-[10%] left-[4%] z-10 bg-white p-1 rounded shadow-sm">
        <img src={qrUrl} alt="QR Verificación" className="w-[70px] h-[70px]" />
      </div>

      {/* 5. ESCUDO DEL CLUB */}
      <div className="absolute bottom-[10%] right-[5%] z-10 w-24 h-24 bg-white rounded-full p-1 flex items-center justify-center shadow-xl border-4 border-blue-900">
        {equipo?.escudo_url ? (
          <img src={equipo.escudo_url} alt="Escudo Club" className="w-full h-full object-contain rounded-full" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm text-center">
            {equipo?.nombre?.substring(0, 3).toUpperCase() || 'CLUB'}
          </div>
        )}
      </div>
      
      {/* 6. SELLO DE LA LIGA */}
      <div className="absolute top-[5%] left-[3%] z-10 w-24 h-24 drop-shadow-lg">
        <img src={selloLiga} alt="Sello Liga" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}