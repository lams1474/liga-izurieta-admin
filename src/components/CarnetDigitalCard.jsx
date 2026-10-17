import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import fondoCarnet from '../assets/carnet-fondo.png'

const CarnetDigitalCard = forwardRef(function CarnetDigitalCard({ jugador, equipo, validacion }, ref) {
  if (!jugador) return null

  const esHabilitado = validacion?.esHabilitado ?? false
  const nombreCompleto = `${jugador.apellidos || ''} ${jugador.nombres || ''}`.trim()
  const cedula = jugador.cedula || ''
  const nombreClub = equipo?.nombre || 'Sin Club'
  const escudoClub = equipo?.escudo_url

  // URL pública para el QR
  const urlVerificacion = `https://web-liga-izurieta.vercel.app/verificar?cedula=${cedula}`

  // Lógica para ajustar el tamaño de la letra si el nombre es muy largo
  const tamanoLetra = nombreCompleto.length > 22 ? 'text-[9px]' : 'text-[12px]'

  return (
    <div
      ref={ref}
      className="carnet-card relative bg-white overflow-hidden shadow-xl rounded-lg"
      style={{
        width: '8.5cm',
        height: '5.5cm',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Fondo del carnet */}
      <img
        src={fondoCarnet}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-0"
        crossOrigin="anonymous"
      />

      {/* Contenido sobre el fondo */}
      <div className="relative w-full h-full z-10">

        {/* FOTO DEL JUGADOR (Izquierda Arriba) */}
        <div
          className="absolute bg-white rounded-sm border-2 border-white shadow-md overflow-hidden flex items-center justify-center"
          style={{ top: '15%', left: '5%', width: '2.2cm', height: '2.6cm' }}
        >
          {jugador.foto_url ? (
            <img
              src={jugador.foto_url}
              alt={nombreCompleto}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center p-1">SIN FOTO</div>
          )}
        </div>

        {/* NOMBRE DEL JUGADOR (Derecha Arriba) */}
        <div 
          className={`absolute font-black uppercase tracking-wide drop-shadow-md leading-tight text-white ${tamanoLetra}`}
          style={{ top: '12%', left: '35%', width: '60%', maxWidth: '5.2cm' }}
        >
          {nombreCompleto}
        </div>

        {/* CÉDULA */}
        <div className="absolute flex items-baseline gap-1" style={{ top: '30%', left: '35%' }}>
          <span className="text-[10px] font-bold opacity-90 text-white">C.C.</span>
          <span className="text-[12px] font-mono font-bold tracking-wider text-white drop-shadow-md">
            {cedula}
          </span>
        </div>

        {/* CLUB */}
        <div className="absolute flex items-center gap-1" style={{ top: '42%', left: '35%', width: '60%' }}>
          <span className="text-[10px] font-bold opacity-90 text-white">CLUB:</span>
          <span className="text-[12px] font-black uppercase tracking-wide text-white drop-shadow-md truncate max-w-[2.8cm]">
            {nombreClub}
          </span>
        </div>

        {/* FIRMA DEL PRESIDENTE (Centro Abajo) */}
        <div className="absolute flex flex-col items-center" style={{ bottom: '10%', left: '35%' }}>
          <div className="font-serif italic text-[12px] text-white opacity-90 transform -rotate-3">
            Luis Maigua
          </div>
          <span className="text-[8px] font-bold text-liga-amarillo uppercase mt-0.5">
            Presidente Liga
          </span>
        </div>

        {/* QR (Izquierda Abajo) */}
        <div 
          className="absolute bg-white p-[2px] rounded-sm z-20" 
          style={{ bottom: '8%', left: '5%', width: '1.5cm', height: '1.5cm' }}
        >
          <QRCodeSVG value={urlVerificacion} size={60} level="M" className="w-full h-full" />
        </div>

        {/* SELLO DEL CLUB Y ESTADO (Derecha Abajo) */}
        <div className="absolute flex items-center gap-2" style={{ bottom: '10%', right: '5%' }}>
          {/* Escudo del club */}
          {escudoClub ? (
            <img
              src={escudoClub}
              alt={nombreClub}
              className="object-contain drop-shadow-lg bg-white rounded-full p-1 border border-gray-200"
              style={{ width: '1.2cm', height: '1.2cm' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div className="bg-white rounded-full flex items-center justify-center font-black text-liga-azul text-[10px] shadow-lg border border-gray-200" style={{ width: '1.2cm', height: '1.2cm' }}>
              {nombreClub.substring(0, 3).toUpperCase()}
            </div>
          )}

          {/* Sello de verificación (Check / X) */}
          {esHabilitado ? (
            <div className="bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ width: '0.6cm', height: '0.6cm' }}>
              <span className="text-[12px] font-bold">✓</span>
            </div>
          ) : (
            <div className="bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white" style={{ width: '0.6cm', height: '0.6cm' }}>
              <span className="text-[12px] font-bold">✕</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
})

export default CarnetDigitalCard