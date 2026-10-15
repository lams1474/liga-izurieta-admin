import { User, CheckCircle, Shield } from 'lucide-react'

export default function CarnetDigitalCard({ jugador, equipo, validacion }) {
  if (!jugador) return null

  const esHabilitado = validacion?.esHabilitado ?? (
    jugador.carnet_pagado &&
    jugador.consentimiento_firmado !== false &&
    !jugador.es_menor_sin_tutor &&
    jugador.estado_pase === 'aprobado'
  )

  const nombreCompleto = `${jugador.apellidos || ''} ${jugador.nombres || ''}`.trim() || 'TORO TORRES JUAN MANUEL'
  const cedula = jugador.cedula || '0500000987'
  const nombreClub = equipo?.nombre || 'SPARTANOS FC'

  return (
    <div className="w-full max-w-[500px] mx-auto print:max-w-none print:w-[85.6mm] print:h-[54mm] print:p-0">
      {/* Tarjeta Carnet Oficial (Proporción 1.58:1 CR80 ID Card) */}
      <div className="relative w-full aspect-[1.58/1] bg-[#031d68] text-white rounded-xl shadow-2xl overflow-hidden border-2 border-liga-amarillo/40 font-sans print:rounded-none print:shadow-none print:border-none print:w-[85.6mm] print:h-[54mm]">
        {/* Diseños de franjas onduladas rojas y amarillas superiores e inferiores */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-400 via-yellow-400 to-red-600 rounded-full blur-2xl opacity-40 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr from-red-600 via-yellow-400 to-amber-400 rounded-full blur-2xl opacity-40 pointer-events-none" />

        {/* Marco decorativo de bordes oficiales */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 316" preserveAspectRatio="none">
          <path d="M0,0 L500,0 L500,30 Q400,10 300,40 Q150,80 0,20 Z" fill="#dc2626" opacity="0.85" />
          <path d="M500,0 L500,20 Q380,5 280,35 Q140,75 0,15 Z" fill="#fbbf24" opacity="0.9" />
          <path d="M0,316 L500,316 L500,290 Q350,310 200,275 Q80,250 0,295 Z" fill="#dc2626" opacity="0.85" />
          <path d="M0,316 L500,316 L500,298 Q360,313 210,282 Q90,260 0,302 Z" fill="#fbbf24" opacity="0.9" />
        </svg>

        {/* Silueta de balón de fútbol al fondo de la derecha */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-15 pointer-events-none text-white">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
            <polygon points="50,25 65,36 59,54 41,54 35,36" fill="currentColor" />
            <line x1="50" y1="25" x2="50" y2="2" stroke="currentColor" strokeWidth="2" />
            <line x1="65" y1="36" x2="95" y2="25" stroke="currentColor" strokeWidth="2" />
            <line x1="59" y1="54" x2="80" y2="85" stroke="currentColor" strokeWidth="2" />
            <line x1="41" y1="54" x2="20" y2="85" stroke="currentColor" strokeWidth="2" />
            <line x1="35" y1="36" x2="5" y2="25" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Encabezado Oficial */}
        <div className="relative z-10 px-4 pt-3.5 flex items-center gap-3">
          {/* Escudo de la Liga */}
          <div className="w-12 h-14 flex-shrink-0 bg-white/10 rounded-lg p-0.5 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Shield className="w-10 h-12 text-liga-amarillo fill-liga-azul drop-shadow-md" />
          </div>

          {/* Nombre de la Liga */}
          <div className="flex-1 text-center pr-2">
            <h1 className="text-sm sm:text-base font-black tracking-wide leading-tight text-white drop-shadow-md uppercase">
              LIGA DEPORTIVA BARRIAL
            </h1>
            <h2 className="text-xs sm:text-sm font-extrabold tracking-wider leading-tight text-white drop-shadow-md uppercase">
              JOSE IGNACIO IZURIETA
            </h2>
          </div>
        </div>

        {/* Contenido Central: Foto + Datos */}
        <div className="relative z-10 px-4 pt-2.5 flex items-start gap-4">
          {/* Columna Izquierda: Foto de Jugador + Barcode */}
          <div className="flex flex-col items-center flex-shrink-0 w-28 sm:w-32">
            {/* Marco de la Foto */}
            <div className="relative w-28 sm:w-32 h-32 sm:h-36 bg-gray-200 rounded-md border-2 border-gray-300 p-1 shadow-lg bg-white">
              <div className="w-full h-full bg-gray-100 overflow-hidden flex items-center justify-center relative">
                {jugador.foto_url ? (
                  <img
                    src={jugador.foto_url}
                    alt={nombreCompleto}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-gray-400" />
                )}
              </div>

              {/* Sello / Badge verde de Verificación Habilitado */}
              <div className="absolute -bottom-1 -right-1">
                {esHabilitado ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white shadow-md">
                    <CheckCircle size={16} className="fill-green-500 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-md">
                    <span className="text-xs font-bold">✕</span>
                  </div>
                )}
              </div>
            </div>

            {/* Código de Barras Inferior */}
            <div className="w-28 sm:w-32 bg-white rounded-md p-1 mt-1.5 shadow-md border border-gray-200 flex flex-col items-center">
              {/* Simulación SVG de código de barras */}
              <svg className="w-full h-5" viewBox="0 0 100 30" preserveAspectRatio="none">
                <rect x="0" y="0" width="3" h="30" fill="black" />
                <rect x="5" y="0" width="1" h="30" fill="black" />
                <rect x="8" y="0" width="4" h="30" fill="black" />
                <rect x="14" y="0" width="2" h="30" fill="black" />
                <rect x="18" y="0" width="5" h="30" fill="black" />
                <rect x="25" y="0" width="2" h="30" fill="black" />
                <rect x="29" y="0" width="1" h="30" fill="black" />
                <rect x="32" y="0" width="4" h="30" fill="black" />
                <rect x="38" y="0" width="2" h="30" fill="black" />
                <rect x="42" y="0" width="6" h="30" fill="black" />
                <rect x="50" y="0" width="1" h="30" fill="black" />
                <rect x="53" y="0" width="3" h="30" fill="black" />
                <rect x="58" y="0" width="4" h="30" fill="black" />
                <rect x="64" y="0" width="2" h="30" fill="black" />
                <rect x="68" y="0" width="5" h="30" fill="black" />
                <rect x="75" y="0" width="2" h="30" fill="black" />
                <rect x="79" y="0" width="3" h="30" fill="black" />
                <rect x="84" y="0" width="1" h="30" fill="black" />
                <rect x="87" y="0" width="5" h="30" fill="black" />
                <rect x="94" y="0" width="3" h="30" fill="black" />
                <rect x="98" y="0" width="2" h="30" fill="black" />
              </svg>
            </div>
          </div>

          {/* Columna Derecha: Nombre, Cédula, Club y Firma */}
          <div className="flex-1 flex flex-col justify-between h-36 sm:h-40 pt-1">
            <div className="space-y-2">
              {/* Nombre del Jugador */}
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wider leading-tight drop-shadow-md">
                {nombreCompleto}
              </h2>

              {/* Cédula */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-widest uppercase">
                  C.C.
                </span>
                <span className="text-sm sm:text-base font-mono font-bold text-white tracking-wider">
                  {cedula}
                </span>
              </div>

              {/* Club */}
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-widest uppercase">
                  CLUB:
                </span>
                <span className="text-sm sm:text-base font-extrabold text-white tracking-wider uppercase">
                  {nombreClub}
                </span>
              </div>
            </div>

            {/* Parte Inferior Derecha: Firma Presidente + Escudo del Club */}
            <div className="flex items-end justify-between pr-2 pb-1">
              {/* Firma del Presidente de la Liga */}
              <div className="flex flex-col items-center">
                <div className="font-serif italic text-sm text-gray-200 select-none transform -rotate-3 border-b border-gray-300 px-2 pb-0.5">
                  Luis Maigua
                </div>
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-white uppercase mt-0.5">
                  PRESIDENTE LIGA
                </span>
              </div>

              {/* Logo / Escudo del Club */}
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-white p-1 shadow-md border border-gray-200 flex items-center justify-center flex-shrink-0">
                <div className="w-full h-full rounded-full bg-liga-azul/10 text-liga-azul flex items-center justify-center font-black text-[10px] text-center uppercase leading-none">
                  {nombreClub.substring(0, 3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}