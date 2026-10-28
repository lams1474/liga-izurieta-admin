/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { FileCheck, CheckCircle2, Clock, Lock, Search, RefreshCw, Eye, X, Calendar, MapPin, UserCheck, Shield } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Actas() {
  const [cargando, setCargando] = useState(true)
  const [actas, setActas] = useState([])
  const [busqueda, setBusqueda] = useState('')

  // Modal Ver Acta Completa
  const [actaSeleccionada, setActaSeleccionada] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargarActas = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('actas')
        .select(`
          id, estado, observaciones, fecha_cierre, firmado_vocal, firmado_arbitro,
          partido:partidos (
            id, fecha_partido, hora_partido, lugar, goles_local, goles_visitante, estado,
            equipo_local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
            equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre, disciplina, categoria)
          )
        `)
        .order('creado_en', { ascending: false })

      if (error) throw error
      setActas(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar actas de partido')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarActas()
  }, [cargarActas])

  const actasFiltradas = actas.filter((a) => {
    if (!busqueda) return true
    const txt = busqueda.toLowerCase()
    const loc = a.partido?.equipo_local?.nombre?.toLowerCase() || ''
    const vis = a.partido?.equipo_visitante?.nombre?.toLowerCase() || ''
    return loc.includes(txt) || vis.includes(txt)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileCheck className="text-liga-azul" size={28} />
            Módulo de Actas de Partido
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de planillas de juego, ingreso de goles, novedades y firmas digitales
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por equipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>

        <button
          onClick={cargarActas}
          className="p-2 text-gray-600 hover:text-liga-azul rounded-lg hover:bg-gray-100 transition-colors"
          title="Recargar actas"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabla de Actas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando actas de juego...</p>
          </div>
        ) : actasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay actas registradas para los partidos actuales.
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
                  <p className={`font-bold mt-1 ${actaSeleccionada.firmado_vocal ? 'text-green-600' : 'text-amber-600'}`}>
                    {actaSeleccionada.firmado_vocal ? '✓ Registrada / Firmado' : '⏳ Pendiente de Firma'}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border text-center">
                  <p className="font-semibold text-gray-500 uppercase">Firma Árbitro</p>
                  <p className={`font-bold mt-1 ${actaSeleccionada.firmado_arbitro ? 'text-green-600' : 'text-amber-600'}`}>
                    {actaSeleccionada.firmado_arbitro ? '✓ Registrada / Firmado' : '⏳ Pendiente de Firma'}
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
    </div>
  )
}