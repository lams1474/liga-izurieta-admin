/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import CarnetDigitalCard from '../components/CarnetDigitalCard'
import { descargarComoImagen, descargarComoPDF } from '../lib/carnetUtils'
import {
  CreditCard, Calendar, Trophy, History, Shield, AlertCircle, Download
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MiCarnet() {
  const { usuario } = useAuth()
  const [cargando, setCargando] = useState(true)
  const [jugador, setJugador] = useState(null)
  const [equipo, setEquipo] = useState(null)
  const [proximoPartido, setProximoPartido] = useState(null)
  const [sancionActiva, setSancionActiva] = useState(null)
  const [deudasPendientes, setDeudasPendientes] = useState([])
  const [pestaña, setPestaña] = useState('carnet')

  const carnetRef = useRef(null)

  const cargarDatosJugador = useCallback(async () => {
    setCargando(true)
    try {
      if (!usuario) {
        setCargando(false)
        return
      }

      // Buscar jugador por user_id (nuevo) o por cédula (fallback)
      let query = supabase
        .from('jugadores')
        .select(`
          *,
          inscripciones:jugador_equipo (
            id, dorsal, posicion, activo,
            equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria, escudo_url)
          )
        `)

      if (usuario.rol === 'jugador' && usuario.jugador_id) {
        query = query.eq('id', usuario.jugador_id)
      } else if (usuario.cedula) {
        query = query.eq('cedula', usuario.cedula)
      } else {
        setCargando(false)
        return
      }

      const { data: dataJugador, error: errJugador } = await query.maybeSingle()

      if (errJugador) console.error(errJugador)

      if (dataJugador) {
        setJugador(dataJugador)

        // Cargar sanciones activas
        const { data: sancData } = await supabase
          .from('sanciones_jugador')
          .select('*')
          .eq('jugador_id', dataJugador.id)
          .eq('activa', true)
          .maybeSingle()
        setSancionActiva(sancData)

        // Cargar deudas pendientes
        const { data: deudasData } = await supabase
          .from('deudas_jugador')
          .select('*')
          .eq('jugador_id', dataJugador.id)

        const pendientes = (deudasData || []).filter(
          (d) => (d.monto || 0) > (d.monto_pagado || 0)
        )
        setDeudasPendientes(pendientes)

        const inscActiva = dataJugador.inscripciones?.find((i) => i.activo)
        if (inscActiva?.equipo) {
          setEquipo(inscActiva.equipo)

          // Cargar próximo partido
          const { data: partidoData } = await supabase
            .from('partidos')
            .select(`
              id, fecha_partido, hora_partido, lugar, estado,
              equipo_local:equipos!partidos_equipo_local_id_fkey (nombre),
              equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (nombre)
            `)
            .or(
              `equipo_local_id.eq.${inscActiva.equipo.id},equipo_visitante_id.eq.${inscActiva.equipo.id}`
            )
            .neq('estado', 'finalizado')
            .order('fecha_partido', { ascending: true })
            .limit(1)
            .maybeSingle()

          setProximoPartido(partidoData)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar información del jugador')
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => {
    cargarDatosJugador()
  }, [cargarDatosJugador])

  // ============ DESCARGAS ============
  async function handleDescargarImagen() {
    if (!carnetRef.current || !jugador) return
    try {
      await descargarComoImagen(carnetRef.current, `carnet-${jugador.cedula}.png`)
      toast.success('Imagen descargada')
    } catch (err) {
      console.error(err)
      toast.error('Error al descargar la imagen')
    }
  }

  async function handleDescargarPDF() {
    if (!carnetRef.current || !jugador) return
    try {
      await descargarComoPDF(carnetRef.current, `carnet-${jugador.cedula}.pdf`)
      toast.success('PDF descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al descargar el PDF')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Encabezado Portal Jugador */}
      <div className="bg-gradient-to-r from-liga-azul to-blue-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="text-liga-amarillo" size={28} />
            Portal del Jugador / Carnet Digital
          </h1>
          <p className="text-sm text-blue-100 mt-1">
            Consulta la validez de tu carnet, tu próximo partido y tus estadísticas
          </p>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setPestaña('carnet')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            pestaña === 'carnet'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard size={18} />
          Mi Carnet Digital
        </button>

        <button
          onClick={() => setPestaña('partido')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            pestaña === 'partido'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={18} />
          Próximo Partido
        </button>

        <button
          onClick={() => setPestaña('stats')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            pestaña === 'stats'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy size={18} />
          Mis Estadísticas
        </button>

        <button
          onClick={() => setPestaña('historial')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            pestaña === 'historial'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={18} />
          Historial Deportivo
        </button>
      </div>

      {/* Contenido según pestaña */}
      {cargando ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Cargando carnet digital...</p>
        </div>
      ) : !jugador ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm">
          <AlertCircle className="mx-auto text-amber-500 mb-3" size={48} />
          <h2 className="text-lg font-bold text-gray-700 mb-1">
            No se encontró tu registro de jugador
          </h2>
          <p className="text-sm text-gray-500">
            Contacta a tu delegado para que verifique tu inscripción.
          </p>
        </div>
      ) : pestaña === 'carnet' ? (
        <div className="space-y-6">
          {/* Alertas */}
          {!jugador.consentimiento_firmado && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Consentimiento de Datos Pendiente</p>
                <p className="text-xs text-red-700 mt-0.5">
                  No has firmado el consentimiento de uso de datos personales. Acércate a la dirigencia o solicita a tu delegado autorizar el consentimiento.
                </p>
              </div>
            </div>
          )}

          {!jugador.carnet_pagado && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded-r-xl text-sm flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Carnet Digital Pendiente de Pago</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Aún no se ha registrado el pago del carnet para la temporada. Acércate a tesorería para habilitar tu carnet oficial.
                </p>
              </div>
            </div>
          )}

          {sancionActiva && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Sanción Disciplinaria Activa</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Motivo: {sancionActiva.motivo} ({sancionActiva.fechas_cumplidas || 0}/
                  {sancionActiva.fechas_sancion || 1} fechas cumplidas)
                </p>
              </div>
            </div>
          )}

          {deudasPendientes.length > 0 && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl text-sm flex items-start gap-3">
              <AlertCircle size={20} className="flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Multa / Deuda Pendiente de Pago</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Tienes {deudasPendientes.length} multa(s) pendiente(s) por un total de $
                  {deudasPendientes
                    .reduce((s, d) => s + ((d.monto || 0) - (d.monto_pagado || 0)), 0)
                    .toFixed(2)}
                  .
                </p>
              </div>
            </div>
          )}

          {/* Carnet + Botones */}
          <div className="flex flex-col items-center gap-4">
            <CarnetDigitalCard
              ref={carnetRef}
              jugador={jugador}
              equipo={equipo}
              validacion={{
                esHabilitado: Boolean(
                  jugador.carnet_pagado &&
                    jugador.consentimiento_firmado !== false &&
                    !sancionActiva &&
                    deudasPendientes.length === 0 &&
                    jugador.estado_pase === 'aprobado'
                ),
              }}
            />

            {/* Botones de descarga */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={handleDescargarImagen}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-200 flex items-center gap-2 transition-colors"
              >
                <Download size={16} />
                Descargar Imagen
              </button>
              <button
                onClick={handleDescargarPDF}
                className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2 transition-colors"
              >
                <Download size={16} />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      ) : pestaña === 'partido' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Calendar className="text-liga-azul" size={22} />
            Tu Próximo Encuentro
          </h2>

          {proximoPartido ? (
            <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Fecha y Hora
                </p>
                <p className="text-lg font-bold text-liga-azul mt-0.5">
                  {proximoPartido.fecha_partido} ·{' '}
                  {proximoPartido.hora_partido?.substring(0, 5)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  📍 {proximoPartido.lugar || 'Cancha Oficial de la Liga'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-center font-bold text-gray-800">
                <span>{proximoPartido.equipo_local?.nombre}</span>
                <span className="bg-liga-azul text-white px-3 py-1 rounded-lg text-xs">
                  VS
                </span>
                <span>{proximoPartido.equipo_visitante?.nombre}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
              No tienes partidos programados para esta fecha.
            </div>
          )}
        </div>
      ) : pestaña === 'stats' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <Trophy className="mx-auto text-liga-amarillo mb-2" size={32} />
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Goles Convertidos
            </p>
            <p className="text-3xl font-black text-gray-800 mt-1">0</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <AlertCircle className="mx-auto text-amber-500 mb-2" size={32} />
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Amarillas Acumuladas
            </p>
            <p className="text-3xl font-black text-amber-600 mt-1">0 / 4</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <Shield className="mx-auto text-liga-rojo mb-2" size={32} />
            <p className="text-xs text-gray-500 uppercase font-semibold">
              Tarjetas Rojas
            </p>
            <p className="text-3xl font-black text-liga-rojo mt-1">0</p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History className="text-liga-azul" size={22} />
            Historial Deportivo de Clubes
          </h2>
          <div className="p-4 bg-gray-50 rounded-xl border text-sm text-gray-700">
            <strong>Club Actual:</strong> {equipo?.nombre || 'Sin Club Actualmente'}
          </div>
        </div>
      )}
    </div>
  )
}