import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import fondoCarnet from '../assets/carnet-fondo.png'
import escudoLiga from '../assets/escudo-liga.png'

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
  const tamanoLetra = nombreCompleto.length > 25 ? 'text-[0.28cm]' : 'text-[0.35cm]'

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
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
      />

      {/* Contenido sobre el fondo */}
      <div className="relative w-full h-full flex p-[0.3cm] gap-[0.2cm]">

        {/* LADO IZQUIERDO: Foto + QR + Sello Liga */}
        <div className="flex flex-col items-center justify-between" style={{ width: '2.4cm' }}>
          
          {/* Foto del jugador */}
          <div
            className="bg-white rounded-sm border-2 border-white shadow-md overflow-hidden flex items-center justify-center mt-[0.1cm]"
            style={{ width: '2.2cm', height: '2.6cm' }}
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

          {/* QR + Escudo Liga */}
          <div className="flex items-end justify-between w-full mt-1">
            {/* QR */}
            <div className="bg-white p-[0.05cm] rounded-sm" style={{ width: '1.5cm', height: '1.5cm' }}>
              <QRCodeSVG value={urlVerificacion} size={60} level="M" className="w-full h-full" />
            </div>
            {/* Escudo Liga */}
            <img src={escudoLiga} alt="Liga" className="w-[0.9cm] h-[0.9cm] object-contain mb-1" crossOrigin="anonymous" />
          </div>
        </div>

        {/* LADO DERECHO: Datos del jugador */}
        <div className="flex-1 flex flex-col justify-between text-white pt-[0.2cm] pl-1">

          {/* Datos personales */}
          <div className="space-y-[0.1cm]">
            {/* Nombre (Ajustable) */}
            <div className={`${tamanoLetra} font-black uppercase leading-tight tracking-wide drop-shadow-md line-clamp-2`}>
              {nombreCompleto}
            </div>

            {/* Cédula */}
            <div className="flex items-baseline gap-1">
              <span className="text-[0.25cm] font-bold opacity-90">C.C.</span>
              <span className="text-[0.3cm] font-mono font-bold tracking-wider drop-shadow-md">
                {cedula}
              </span>
            </div>

            {/* Club */}
            <div className="flex items-center gap-1">
              <span className="text-[0.25cm] font-bold opacity-90">CLUB:</span>
              <span className="text-[0.3cm] font-black uppercase tracking-wide drop-shadow-md line-clamp-1">
                {nombreClub}
              </span>
            </div>
          </div>

          {/* Parte inferior derecha: Escudo del club + Estado + Firma */}
          <div className="flex items-end justify-between mt-auto">
            
            {/* Firma del presidente */}
            <div className="flex flex-col items-center">
              <div className="font-serif italic text-[0.35cm] text-white opacity-90 transform -rotate-3">
                Luis Maigua
              </div>
              <span className="text-[0.2cm] font-bold text-liga-amarillo uppercase mt-0.5">
                Presidente
              </span>
            </div>

            {/* Estado de habilitación */}
            <div className="flex items-center gap-2">
              {esHabilitado ? (
                <div className="bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg border border-white" style={{ width: '0.7cm', height: '0.7cm' }}>
                  <span className="text-[0.4cm] font-bold">✓</span>
                </div>
              ) : (
                <div className="bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white" style={{ width: '0.7cm', height: '0.7cm' }}>
                  <span className="text-[0.4cm] font-bold">✕</span>
                </div>
              )}

              {/* Escudo del club */}
              {escudoClub ? (
                <img
                  src={escudoClub}
                  alt={nombreClub}
                  className="object-contain drop-shadow-lg bg-white rounded-full p-1"
                  style={{ width: '1.3cm', height: '1.3cm' }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="bg-white/95 rounded-full flex items-center justify-center font-black text-liga-azul text-[0.3cm] shadow-lg" style={{ width: '1.3cm', height: '1.3cm' }}>
                  {nombreClub.substring(0, 3).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default CarnetDigitalCard