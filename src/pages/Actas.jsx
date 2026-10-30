/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { FileCheck, CheckCircle2, Clock, Lock, Eye, X, Calendar, MapPin, UserCheck, Shield, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Actas() {
  const { usuario } = useAuth()

  const [pestana, setPestana] = useState('pendientes')
  const [actas, setActas] = useState([])
  const [cargando, setCargando] = useState(true)

  const esCapitan = usuario?.rol === 'capitan'

  // Modal Ver Acta Completa
  const [actaSeleccionada, setActaSeleccionada] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargarActas = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('actas')
        .select(`
          id, estado, observaciones, cerrada_en,
          partido:partidos (
            id, fecha_partido, hora_partido, lugar, goles_local, goles_visitante, estado,
            equipo_local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
            equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre, disciplina, categoria),
            faltas:faltas_partido (
              id, tipo, minuto, 
              jugador:jugadores (nombres, apellidos, dorsal), 
              equipo:equipos (nombre)
            ),
            goles:goles (
              id, minuto, 
              jugador:jugadores (nombres, apellidos), 
              equipo:equipos (nombre)
            )
          ),
          firmas:firmas_acta (firmante_tipo, firmado_en)
        `)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setActas(data || [])
    } catch (err) {
      console.error("Error cargando actas:", err)
      toast.error('Error al cargar actas de partido')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarActas()
  }, [cargarActas])

  const actasFiltradas = actas.filter((a) => {
    if (pestana === 'pendientes') {
      return a.estado === 'firmando' || a.estado === 'abierta'
    } else {
      return a.estado === 'cerrada'
    }
  })

  if (cargando) return <div className="p-8 text-center text-gray-500">Cargando actas...</div>

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-liga-azul">Actas y Planillas</h1>
            <p className="text-gray-500 text-sm">Gestión de partidos</p>
          </div>
          {!esCapitan && (
            <div className="flex bg-white rounded-lg shadow-sm p-1">
              <button onClick={() => setPestana('pendientes')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${pestana === 'pendientes' ? 'bg-liga-azul text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Pendientes</button>
              <button onClick={() => setPestana('historial')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${pestana === 'historial' ? 'bg-liga-azul text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Historial de Actas</button>
            </div>
          )}
        </div>

        {actasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-2" />
            {pestana === 'pendientes' ? 'No hay partidos pendientes.' : 'No hay partidos finalizados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Partido</th>
                  <th className="px-6 py-3.5">Resultado</th>
                  <th className="px-6 py-3.5">Observaciones</th>
                  <th className="px-6 py-3.5 text-center">Estado del Acta</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actasFiltradas.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {a.partido?.equipo_local?.nombre} vs {a.partido?.equipo_visitante?.nombre}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">
                      {a.partido?.goles_local ?? 0} - {a.partido?.goles_visitante ?? 0}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs max-w-xs truncate">
                      {a.observaciones || 'Sin observaciones'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {a.estado === 'cerrada' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          <Lock size={13} /> Cerrada & Firmada
                        </span>
                      ) : a.estado === 'firmando' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          <Clock size={13} /> En Proceso de Firma
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          <CheckCircle2 size={13} /> Abierta (Planilla)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <button
                        onClick={() => {
                          setActaSeleccionada(a)
                          setModalAbierto(true)
                        }}
                        className="inline-flex items-center gap-1 bg-liga-azul text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors shadow-sm"
                      >
                        <Eye size={14} /> Ver Acta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Ver Acta Completa Sincronizada */}
      {modalAbierto && actaSeleccionada && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalAbierto(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-liga-azul">
                  <FileCheck size={24} />
                  <div>
                    <h3 className="text-lg font-bold">Acta Oficial de Juego</h3>
                    <p className="text-xs text-gray-500">ID del Acta: {actaSeleccionada.id}</p>
                  </div>
                </div>
                <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* Datos del Encuentro */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-liga-azul" />
                  <div>
                    <p className="font-semibold text-gray-500 uppercase">Fecha y Hora</p>
                    <p className="font-bold text-gray-900">{actaSeleccionada.partido?.fecha_partido || 'Sin fecha'} · {actaSeleccionada.partido?.hora_partido?.substring(0, 5) || '--:--'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-liga-azul" />
                  <div>
                    <p className="font-semibold text-gray-500 uppercase">Lugar / Cancha</p>
                    <p className="font-bold text-gray-900">{actaSeleccionada.partido?.lugar || 'Cancha Oficial'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-liga-azul" />
                  <div>
                    <p className="font-semibold text-gray-500 uppercase">Disciplina / Cat.</p>
                    <p className="font-bold text-gray-900 uppercase">{actaSeleccionada.partido?.equipo_local?.disciplina || 'Fútbol'} - {actaSeleccionada.partido?.equipo_local?.categoria || 'Abierta'}</p>
                  </div>
                </div>
              </div>

              {/* Resultado del Partido */}
              <div className="bg-gray-900 text-white rounded-xl p-5 flex items-center justify-between text-center">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Local</p>
                  <p className="text-lg font-black uppercase text-white mt-1">{actaSeleccionada.partido?.equipo_local?.nombre || 'Local'}</p>
                </div>

                <div className="px-6 py-2 bg-liga-azul text-white font-mono font-black text-2xl rounded-xl shadow-inner border border-white/20">
                  {actaSeleccionada.partido?.goles_local ?? 0} - {actaSeleccionada.partido?.goles_visitante ?? 0}
                </div>

                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Visitante</p>
                  <p className="text-lg font-black uppercase text-white mt-1">{actaSeleccionada.partido?.equipo_visitante?.nombre || 'Visitante'}</p>
                </div>
              </div>

              {/* Novedades y Observaciones de Vocalía */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck size={18} className="text-liga-azul" /> Novedades y Observaciones del Vocal
                </h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed min-h-[70px]">
                  {actaSeleccionada.observaciones || 'Sin novedades registradas durante el partido.'}
                </div>
              </div>

              {/* Firmas Digitales */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border text-center">
                  <p className="font-semibold text-gray-500 uppercase">Firma Vocal / Turno</p>
                  <p className={`font-bold mt-1 ${actaSeleccionada.firma_vocal ? 'text-green-600' : 'text-amber-600'}`}>
                    {actaSeleccionada.firma_vocal ? '✓ Registrada / Firmado' : '⏳ Pendiente de Firma'}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border text-center">
                  <p className="font-semibold text-gray-500 uppercase">Firma Árbitro</p>
                  <p className={`font-bold mt-1 ${actaSeleccionada.firma_arbitro ? 'text-green-600' : 'text-amber-600'}`}>
                    {actaSeleccionada.firma_arbitro ? '✓ Registrada / Firmado' : '⏳ Pendiente de Firma'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t pt-4">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="px-5 py-2 bg-liga-azul text-white rounded-lg text-sm font-semibold hover:bg-blue-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}