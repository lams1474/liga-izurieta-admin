import { Shield, CheckCircle, AlertOctagon, User, QrCode } from 'lucide-react'

export default function CarnetDigitalCard({ jugador, equipo, validacion }) {
  if (!jugador) return null

  const esHabilitado = validacion?.esHabilitado ?? (
    jugador.carnet_pagado &&
    !jugador.es_menor_sin_tutor &&
    jugador.foto_actualizada &&
    jugador.estado_pase === 'aprobado'
  )

  const motivos = validacion?.motivos || []

  return (
    <div className="max-w-sm mx-auto bg-gradient-to-b from-liga-azul via-blue-900 to-indigo-950 text-white rounded-2xl shadow-2xl overflow-hidden border-2 border-liga-amarillo/40 relative">
      {/* Encabezado del Carnet */}
      <div className="bg-liga-azul/80 px-4 py-3 border-b border-liga-amarillo/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-liga-amarillo text-liga-azul flex items-center justify-center font-bold">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-liga-amarillo">
              LIGA JOSE IGNACIO IZURIETA
            </h3>
            <p className="text-[10px] text-gray-300">CARNET DIGITAL OFICIAL</p>
          </div>
        </div>
        <span className="text-[10px] bg-liga-amarillo/20 text-liga-amarillo font-bold px-2 py-0.5 rounded-full border border-liga-amarillo/30">
          2026 - 2027
        </span>
      </div>

      {/* Cuerpo del Carnet */}
      <div className="p-5 flex flex-col items-center text-center space-y-3 relative z-10">
        {/* Foto del Jugador */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-liga-amarillo overflow-hidden bg-gray-100 flex items-center justify-center shadow-lg">
            {jugador.foto_url ? (
              <img
                src={jugador.foto_url}
                alt={`${jugador.nombres} ${jugador.apellidos}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={50} className="text-gray-400" />
            )}
          </div>
          {/* Badge de Estado */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            {esHabilitado ? (
              <span className="bg-green-500 text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase">
                <CheckCircle size={12} /> Habilitado
              </span>
            ) : (
              <span className="bg-liga-rojo text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase">
                <AlertOctagon size={12} /> Inhabilitado
              </span>
            )}
          </div>
        </div>

        {/* Nombres y Código */}
        <div className="pt-2">
          <h2 className="text-lg font-black uppercase text-white leading-tight">
            {jugador.nombres} {jugador.apellidos}
          </h2>
          <p className="text-xs font-mono text-liga-amarillo font-bold mt-0.5">
            {jugador.codigo_interno || 'JUG-00000'}
          </p>
        </div>

        {/* Detalles del Club */}
        <div className="w-full bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-xs space-y-1.5">
          <div className="flex justify-between border-b border-white/10 pb-1">
            <span className="text-gray-300">Club:</span>
            <span className="font-bold text-white uppercase">{equipo?.nombre || 'Sin Club'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-1">
            <span className="text-gray-300">Cédula:</span>
            <span className="font-mono font-bold text-white">{jugador.cedula}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-1">
            <span className="text-gray-300">Disciplina:</span>
            <span className="font-bold text-liga-amarillo capitalize">{equipo?.disciplina || 'Futsala'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Categoría:</span>
            <span className="font-bold text-white capitalize">{equipo?.categoria || 'Hombres'}</span>
          </div>
        </div>

        {/* Motivos de bloqueo si no está habilitado */}
        {!esHabilitado && motivos.length > 0 && (
          <div className="w-full bg-red-950/80 border border-red-500/50 rounded-lg p-2.5 text-[11px] text-red-200 text-left space-y-1">
            <p className="font-bold text-red-400 uppercase text-[10px] border-b border-red-500/30 pb-0.5">
              Motivos de inhabilitación:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {motivos.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Código QR de Verificación */}
        <div className="pt-2 flex flex-col items-center">
          <div className="bg-white p-2 rounded-xl shadow-md">
            <QrCode size={64} className="text-liga-azul" />
          </div>
          <p className="text-[9px] text-gray-300 mt-1.5 font-mono uppercase">
            Escanea para validar en mesa
          </p>
        </div>
      </div>
    </div>
  )
}