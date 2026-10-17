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
  // Usamos el hash (#) para que no cause 404 en Vercel
  const urlVerificacion = `https://web-liga-izurieta.vercel.app/#/verificar?cedula=${cedula}`

  return (
    <div
      ref={ref}
      className="carnet-card relative bg-white overflow-hidden"
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
      <div className="relative w-full h-full flex p-[0.3cm] gap-[0.3cm]">

        {/* LADO IZQUIERDO: Foto + QR */}
        <div className="flex flex-col items-center justify-between" style={{ width: '2.3cm' }}>
          {/* Foto del jugador */}
          <div
            className="bg-white rounded-sm border-2 border-white shadow-md overflow-hidden flex items-center justify-center"
            style={{ width: '2.2cm', height: '2.8cm' }}
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

          {/* QR */}
          <div className="bg-white p-[0.05cm] rounded-sm" style={{ width: '2cm', height: '2cm' }}>
            <QRCodeSVG
              value={urlVerificacion}
              size={80}
              level="M"
              className="w-full h-full"
            />
          </div>
        </div>

        {/* LADO DERECHO: Datos del jugador */}
        <div className="flex-1 flex flex-col justify-between text-white pt-[0.2cm]">

          {/* Datos personales */}
          <div className="space-y-[0.15cm]">
            {/* Nombre */}
            <div>
              <div className="text-[0.35cm] font-black uppercase leading-tight tracking-wide drop-shadow-md">
                {nombreCompleto}
              </div>
            </div>

            {/* Cédula */}
            <div className="flex items-baseline gap-1">
              <span className="text-[0.28cm] font-bold opacity-90">C.C.</span>
              <span className="text-[0.32cm] font-mono font-bold tracking-wider drop-shadow-md">
                {cedula}
              </span>
            </div>

            {/* Club */}
            <div>
              <span className="text-[0.28cm] font-bold opacity-90">CLUB: </span>
              <span className="text-[0.32cm] font-black uppercase tracking-wide drop-shadow-md">
                {nombreClub}
              </span>
            </div>
          </div>

          {/* Parte inferior: Escudo del club + Estado */}
          <div className="flex items-end justify-between">
            {/* Escudo del club */}
            {escudoClub ? (
              <img
                src={escudoClub}
                alt={nombreClub}
                className="object-contain drop-shadow-lg"
                style={{ width: '1.4cm', height: '1.4cm' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="bg-white/95 rounded-full flex items-center justify-center font-black text-liga-azul text-[0.3cm] shadow-lg"
                style={{ width: '1.4cm', height: '1.4cm' }}
              >
                {nombreClub.substring(0, 3).toUpperCase()}
              </div>
            )}

            {/* Estado de habilitación */}
            <div className="flex items-center gap-1">
              {esHabilitado ? (
                <div className="bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg border border-white"
                  style={{ width: '0.6cm', height: '0.6cm' }}>
                  <span className="text-[0.35cm] font-bold">✓</span>
                </div>
              ) : (
                <div className="bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border border-white"
                  style={{ width: '0.6cm', height: '0.6cm' }}>
                  <span className="text-[0.3cm] font-bold">✕</span>
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