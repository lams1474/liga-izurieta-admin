/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import {
  X, User, Edit, DollarSign, UserMinus, AlertTriangle,
  FileText, Shield, Award, Clock,
  CheckCircle, XCircle, QrCode, Printer, CheckSquare, XSquare, Power, Trash2
} from 'lucide-react'
import CarnetDigitalCard from './CarnetDigitalCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function JugadorDetalleDrawer({ abierto, onCerrar, jugadorId, onEditar, onCambio }) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin' || usuario?.rol === 'secretaria'

  const [cargando, setCargando] = useState(true)
  const [jugador, setJugador] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [historial, setHistorial] = useState([])
  const [sanciones, setSanciones] = useState([])
  const [deudas, setDeudas] = useState([])

  const [modalPago, setModalPago] = useState(false)
  const [modalBaja, setModalBaja] = useState(false)
  const [modalCarnet, setModalCarnet] = useState(false)
  const [montoPago, setMontoPago] = useState('1.00')
  const [guardando, setGuardando] = useState(false)

  const cargarTodo = useCallback(async () => {
    setCargando(true)
    try {
      const { data: j } = await supabase.from('jugadores').select('*').eq('id', jugadorId).single()
      setJugador(j)

      const { data: insc } = await supabase
        .from('jugador_equipo')
        .select(`
          id, dorsal, posicion, activo, fecha_inscripcion, calificado, estado_pase,
          equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria, escudo_url)
        `)
        .eq('jugador_id', jugadorId)
        .eq('activo', true)
      setInscripciones(insc || [])

      const { data: hist } = await supabase
        .from('historial_clubes_jugador')
        .select(`id, temporada, fecha_desde, fecha_hasta, tipo_movimiento, observaciones, equipo:equipos!historial_clubes_jugador_equipo_id_fkey (id, nombre, disciplina, categoria)`)
        .eq('jugador_id', jugadorId)
        .order('fecha_desde', { ascending: false })
      setHistorial(hist || [])

      const { data: sanc } = await supabase
        .from('sanciones_jugador')
        .select(`id, tipo, motivo, fechas_sancion, fechas_cumplidas, fecha_inicio, activa, equipo:equipos!sanciones_jugador_equipo_id_fkey (nombre)`)
        .eq('jugador_id', jugadorId)
        .eq('activa', true)
        .order('creado_en', { ascending: false })
      setSanciones(sanc || [])

      const { data: deu } = await supabase
        .from('deudas_jugador')
        .select(`id, concepto, monto, monto_pagado, fecha_emision, fecha_vencimiento, equipo:equipos!deudas_jugador_equipo_id_fkey (nombre)`)
        .eq('jugador_id', jugadorId)
        .order('creado_en', { ascending: false })
      setDeudas(deu || [])

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [jugadorId])

  useEffect(() => {
    if (abierto && jugadorId) {
      cargarTodo()
    }
  }, [abierto, jugadorId, cargarTodo])

  function calcularEdad(fechaNac) {
    if (!fechaNac) return '—'
    const hoy = new Date()
    const nac = new Date(fechaNac)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const mes = hoy.getMonth() - nac.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  const deudaTotal = deudas.reduce((sum, d) => sum + (d.monto - d.monto_pagado), 0)

  async function registrarPago() {
    if (!montoPago || parseFloat(montoPago) <= 0) return toast.error('Ingresa un monto válido')
    setGuardando(true)
    try {
      await supabase.from('jugadores').update({ carnet_pagado: true, carnet_pagado_en: new Date().toISOString(), carnet_ano: new Date().getFullYear(), carnet_monto: parseFloat(montoPago) }).eq('id', jugadorId)
      await supabase.from('pagos_carnet').insert({ jugador_id: jugadorId, monto: parseFloat(montoPago), forma_pago: 'efectivo', registrado_por: usuario.id, observaciones: 'Registrado desde detalle del jugador' })
      toast.success('Pago registrado correctamente')
      setModalPago(false)
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar pago')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarConsentimiento(valor) {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ consentimiento_firmado: valor })
        .eq('id', jugadorId)

      if (error) throw error

      toast.success(valor ? 'Consentimiento de datos aceptado' : 'Consentimiento marcado como pendiente')
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar consentimiento de datos')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstadoPase(nuevoEstado) {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ estado_pase: nuevoEstado })
        .eq('id', jugadorId)

      if (error) throw error

      toast.success(`Pase ${nuevoEstado === 'aprobado' ? 'aprobado' : 'rechazado'}`)
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar pase')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarCalificacion(cal) {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ calificado: cal })
        .eq('id', jugadorId)

      if (error) throw error

      toast.success(cal ? 'Jugador calificado correctamente' : 'Calificación desmarcada')
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al calificar jugador')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstadoActivo(act) {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('jugadores')
        .update({ activo: act })
        .eq('id', jugadorId)

      if (error) throw error

      toast.success(act ? 'Jugador activado en el sistema' : 'Jugador inactivado en el sistema')
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar estado activo')
    } finally {
      setGuardando(false)
    }
  }


  async function cambiarCalificacionEquipo(inscripcionId, cal) {
    setGuardando(true)
    try {
      const { error } = await supabase.from('jugador_equipo').update({ calificado: cal }).eq('id', inscripcionId)
      if (error) throw error
      toast.success(cal ? 'Calificado en esta disciplina' : 'Calificación removida')
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al calificar')
    } finally {
      setGuardando(false)
    }
  }

  async function cambiarEstadoPaseEquipo(inscripcionId, nuevoEstado) {
    setGuardando(true)
    try {
      // Actualizamos la inscripción específica del equipo
      const { error: err1 } = await supabase.from('jugador_equipo').update({ estado_pase: nuevoEstado }).eq('id', inscripcionId)
      if (err1) throw err1

      // También actualizamos el estado general del jugador (por si acaso la interfaz lee de ahí)
      await supabase.from('jugadores').update({ estado_pase: nuevoEstado }).eq('id', jugadorId)

      toast.success(`Pase ${nuevoEstado}`)
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar pase')
    } finally {
      setGuardando(false)
    }
  }


  async function eliminarJugador() {
    if (!window.confirm("⚠️ ¿Estás seguro de ELIMINAR a este jugador permanentemente? Esta acción no se puede deshacer y solo funciona si el jugador no ha jugado ningún partido.")) return;

    setGuardando(true);
    try {
      const { count: eventosCount } = await supabase.from('goles').select('*', { count: 'exact', head: true }).eq('jugador_id', jugadorId);
      const { count: sancionesCount } = await supabase.from('sanciones_jugador').select('*', { count: 'exact', head: true }).eq('jugador_id', jugadorId);

      if (eventosCount > 0 || sancionesCount > 0) {
        throw new Error('No se puede eliminar: el jugador ya tiene historial (goles o tarjetas). Usa el botón "Inactivar Jugador" en su lugar.');
      }

      await supabase.from('jugador_equipo').delete().eq('jugador_id', jugadorId);
      await supabase.from('historial_clubes_jugador').delete().eq('jugador_id', jugadorId);

      const { error } = await supabase.from('jugadores').delete().eq('id', jugadorId);
      if (error) throw error;

      toast.success('Jugador eliminado correctamente');
      onCerrar();
      onCambio();

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBaja() {
    if (!modalBaja) return;
    setGuardando(true)
    try {
      await supabase.from('jugador_equipo').update({ activo: false }).eq('id', modalBaja.id)
      const hoy = new Date().toISOString().split('T')[0]
      await supabase.from('historial_clubes_jugador').update({ fecha_hasta: hoy }).eq('jugador_id', jugadorId).eq('equipo_id', modalBaja.equipo.id).is('fecha_hasta', null)

      toast.success('Jugador dado de baja de esta nómina')
      setModalBaja(null)
      await cargarTodo()
      onCambio?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al dar de baja')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) return null

  return (
    <>
      <div onClick={onCerrar} className="fixed inset-0 bg-black/40 z-40" />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gray-50 shadow-2xl z-50 overflow-y-auto">

        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">Detalle del Jugador</h2>
            <p className="text-xs text-liga-amarillo">{jugador?.codigo_interno || 'Cargando...'}</p>
          </div>
          <button onClick={onCerrar} className="p-2 hover:bg-white/10 rounded-md transition-colors"><X size={22} /></button>
        </div>

        {cargando ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liga-azul mx-auto"></div></div>
        ) : !jugador ? (
          <div className="p-12 text-center"><p className="text-gray-500">Jugador no encontrado</p></div>
        ) : (
          <div className="p-6 space-y-6">

            {/* FOTO + NOMBRE */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-liga-azul/20 flex-shrink-0">
                  {jugador.foto_url ? (
                    <img
                      src={jugador.foto_url}
                      alt={`${jugador.nombres} ${jugador.apellidos}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{jugador.apellidos} {jugador.nombres}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{jugador.codigo_interno}</span>
                    {jugador.es_menor && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">Menor de edad</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* DATOS PERSONALES */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><User size={16} /> Datos Personales</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Cédula</p><p className="font-semibold">{jugador.cedula}</p></div>
                <div><p className="text-gray-500 text-xs">Edad</p><p className="font-semibold">{calcularEdad(jugador.fecha_nacimiento)} años</p></div>
                <div><p className="text-gray-500 text-xs">Fecha de nacimiento</p><p className="font-semibold">{jugador.fecha_nacimiento}</p></div>
                <div><p className="text-gray-500 text-xs">Teléfono</p><p className="font-semibold">{jugador.telefono || '—'}</p></div>
                <div className="col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs">Consentimiento de Datos</p>
                    <p className={`font-semibold text-xs ${jugador.consentimiento_firmado ? 'text-green-600' : 'text-red-600'}`}>{jugador.consentimiento_firmado ? '✓ Aceptado' : '✕ Pendiente'}</p>
                  </div>
                  <button onClick={() => cambiarConsentimiento(!jugador.consentimiento_firmado)} disabled={guardando} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${jugador.consentimiento_firmado ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-600 text-white'}`}>
                    {jugador.consentimiento_firmado ? 'Revocar' : 'Aceptar'}
                  </button>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Edad</p>
                  <p className="font-semibold">{calcularEdad(jugador.fecha_nacimiento)} años</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Fecha de nacimiento</p>
                  <p className="font-semibold">{jugador.fecha_nacimiento}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Teléfono</p>
                  <p className="font-semibold">{jugador.telefono || '—'}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-xs">Consentimiento de Datos</p>
                    <p className={`font-semibold text-xs ${jugador.consentimiento_firmado ? 'text-green-600' : 'text-red-600'}`}>
                      {jugador.consentimiento_firmado ? '✓ Aceptado / Firmado' : '✕ No Aceptado (Pendiente)'}
                    </p>
                  </div>

                  <button
                    onClick={() => cambiarConsentimiento(!jugador.consentimiento_firmado)}
                    disabled={guardando}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      jugador.consentimiento_firmado
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {jugador.consentimiento_firmado ? 'Revocar Consentimiento' : 'Aceptar Consentimiento'}
                  </button>
                </div>
                {jugador.es_menor && (
                  <>
                    <div className="col-span-2 border-t pt-3 mt-2">
                      <p className="text-liga-azul font-semibold text-xs uppercase mb-2">Datos del Tutor</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Nombre</p>
                      <p className="font-semibold">{jugador.tutor_nombre || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Cédula</p>
                      <p className="font-semibold">{jugador.tutor_cedula || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Teléfono</p>
                      <p className="font-semibold">{jugador.tutor_telefono || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* INSCRIPCIONES Y CALIFICACIONES POR EQUIPO */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><Shield size={16} /> Inscripciones Deportivas</h4>
              {inscripciones.length === 0 ? (
                <p className="text-sm text-gray-500">Sin equipo activo</p>
              ) : (
                <div className="space-y-4">
                  {inscripciones.map((insc) => (
                    <div key={insc.id} className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">{insc.equipo?.nombre}</p>
                          <p className="text-xs text-gray-600 capitalize">{insc.equipo?.disciplina} · {insc.equipo?.categoria}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${insc.estado_pase === 'aprobado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            Pase: {insc.estado_pase || 'pendiente'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${insc.calificado ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                            {insc.calificado ? 'Calificado' : 'Sin calificar'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-2 text-xs mb-3">
                        <span><strong>Dorsal:</strong> {insc.dorsal || '—'}</span>
                        <span><strong>Posición:</strong> {insc.posicion || '—'}</span>
                      </div>

                      {esAdmin && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                          {insc.estado_pase !== 'aprobado' ? (
                            <button onClick={() => cambiarEstadoPaseEquipo(insc.id, 'aprobado')} disabled={guardando} className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              <CheckCircle size={14} /> Aprobar Pase
                            </button>
                          ) : (
                            <button onClick={() => cambiarEstadoPaseEquipo(insc.id, 'pendiente')} disabled={guardando} className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              <XCircle size={14} /> Desmarcar Pase
                            </button>
                          )}

                          {!insc.calificado ? (
                            <button onClick={() => cambiarCalificacionEquipo(insc.id, true)} disabled={guardando} className="bg-liga-azul text-white hover:bg-liga-azul/90 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              <CheckSquare size={14} /> Calificar en esta Disciplina
                            </button>
                          ) : (
                            <button onClick={() => cambiarCalificacionEquipo(insc.id, false)} disabled={guardando} className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                              <XSquare size={14} /> Quitar Calificación
                            </button>
                          )}

                          <button onClick={() => setModalBaja(insc)} disabled={guardando} className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-semibold ml-auto flex items-center gap-1">
                            <UserMinus size={14} /> Dar de baja de este equipo
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PASE Y CALIFICACIÓN */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2">
                <FileText size={16} /> Pase Deportivo y Calificación
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-gray-500 text-xs">Tipo de Pase</p>
                  <p className="font-semibold capitalize">
                    {jugador.tipo_pase?.replace('_', ' ') || 'Nuevo'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Estado del Pase</p>
                  <p className={`font-semibold ${
                    jugador.estado_pase === 'aprobado' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {jugador.estado_pase || 'Pendiente'}
                  </p>
                </div>
              </div>

              {/* Botones para Administrador y Secretaría */}
              {esAdmin && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {jugador.estado_pase !== 'aprobado' ? (
                    <button
                      onClick={() => cambiarEstadoPase('aprobado')}
                      disabled={guardando}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-700 flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Aprobar Pase
                    </button>
                  ) : (
                    <button
                      onClick={() => cambiarEstadoPase('pendiente')}
                      disabled={guardando}
                      className="bg-yellow-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-yellow-600 flex items-center gap-1.5"
                    >
                      <XCircle size={14} /> Desmarcar Pase
                    </button>
                  )}

                  {!jugador.calificado ? (
                    <button
                      onClick={() => cambiarCalificacion(true)}
                      disabled={guardando}
                      className="bg-liga-azul text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-liga-azul/90 flex items-center gap-1.5"
                    >
                      <CheckSquare size={14} /> Calificar Jugador
                    </button>
                  ) : (
                    <button
                      onClick={() => cambiarCalificacion(false)}
                      disabled={guardando}
                      className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-300 flex items-center gap-1.5"
                    >
                      <XSquare size={14} /> Quitar Calificación
                    </button>
                  )}

                  <button
                    onClick={() => cambiarEstadoActivo(!jugador.activo)}
                    disabled={guardando}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                      jugador.activo
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Power size={14} /> {jugador.activo ? 'Inactivar' : 'Activar'}
                  </button>
                </div>
              )}
            </section>

            {/* SANCIONES */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><AlertTriangle size={16} /> Sanciones Activas ({sanciones.length})</h4>
              {sanciones.length === 0 ? <p className="text-sm text-green-600">✓ Sin sanciones activas</p> : (
                <div className="space-y-2">
                  {sanciones.map((s) => (
                    <div key={s.id} className="p-3 bg-red-50 rounded-md border-l-4 border-red-500">
                      <p className="font-semibold text-sm text-red-800 capitalize">{s.tipo?.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-700 mt-1">{s.motivo}</p>
                      <p className="text-xs text-red-600 mt-1">Faltan: {s.fechas_sancion - s.fechas_cumplidas} fecha(s)</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* DEUDAS */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><DollarSign size={16} /> Deudas {deudaTotal > 0 && <span className="ml-auto text-liga-rojo normal-case text-base">Total: ${deudaTotal.toFixed(2)}</span>}</h4>
              {deudas.length === 0 ? <p className="text-sm text-green-600">✓ Sin deudas pendientes</p> : (
                <div className="space-y-2">
                  {deudas.map((d) => {
                    const saldo = d.monto - d.monto_pagado
                    return (
                      <div key={d.id} className={`p-3 rounded-md border-l-4 ${saldo > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{d.concepto}</p>
                            <p className="text-xs text-gray-600">{d.equipo?.nombre} · {d.fecha_emision}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">${d.monto.toFixed(2)}</p>
                            <p className={`text-xs ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>Saldo: ${saldo.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* CARNET */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><Award size={16} /> Carnet Digital</h4>
              <div className="flex items-center justify-between">
                <div>
                  {jugador.carnet_pagado ? (
                    <div className="flex items-center gap-2 text-green-600"><CheckCircle size={20} /><span className="font-semibold">Pagado ({jugador.carnet_ano})</span></div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600"><XCircle size={20} /><span className="font-semibold">No pagado</span></div>
                  )}
                </div>
                {!jugador.carnet_pagado && esAdmin && (
                  <button onClick={() => setModalPago(true)} className="bg-liga-azul text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center gap-2"><DollarSign size={16} /> Registrar Pago</button>
                )}
              </div>
            </section>

            {/* HISTORIAL */}
            {historial.length > 0 && (
              <section className="bg-white rounded-lg shadow-md p-5">
                <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b flex items-center gap-2"><Clock size={16} /> Historial de Clubes</h4>
                <div className="space-y-2">
                  {historial.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3">
                      <div className="flex-1">
                        <p className="font-semibold">{h.equipo?.nombre}</p>
                        <p className="text-xs text-gray-500">{h.fecha_desde} → {h.fecha_hasta || 'Actual'}</p>
                        <p className="text-xs text-gray-400 capitalize">{h.tipo_movimiento?.replace('_', ' ')} · {h.temporada}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ACCIONES GLOBALES */}
            <section className="bg-white rounded-lg shadow-md p-5">
              <h4 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">Acciones Globales</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setModalCarnet(true)}
                  className="bg-liga-amarillo text-liga-azul px-4 py-2 rounded-md text-sm font-semibold hover:bg-liga-amarillo/90 flex items-center gap-2"
                >
                  <QrCode size={16} />
                  Ver Carnet Oficial
                </button>

                {esAdmin && (
                  <button onClick={() => { onCerrar?.(); onEditar?.(jugadorId) }} className="bg-liga-azul text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
                    <Edit size={16} /> Editar Datos Personales
                  </button>
                )}
                {esAdmin && (
                   <button onClick={() => cambiarEstadoActivo(!jugador.activo)} disabled={guardando} className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 ${jugador.activo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    <Power size={16} /> {jugador.activo ? 'Inactivar Jugador Globalmente' : 'Activar Jugador Globalmente'}
                  </button>
                )}
                {esAdmin && (
                  <button onClick={eliminarJugador} disabled={guardando} className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 bg-gray-800 text-white hover:bg-black transition-colors">
                    <Trash2 size={16} /> Eliminar Jugador
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* MODALES (Pago, Baja, Carnet) se mantienen igual */}
      {modalPago && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalPago(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-liga-azul mb-2">Registrar Pago de Carnet</h3>
              <p className="text-sm text-gray-600 mb-4">{jugador?.apellidos} {jugador?.nombres}</p>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Monto a pagar</label>
              <input type="number" step="0.01" min="0.01" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setModalPago(false)} disabled={guardando} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={registrarPago} disabled={guardando} className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50">{guardando ? 'Guardando...' : 'Confirmar pago'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Carnet Digital Oficial */}
      {modalCarnet && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalCarnet(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-liga-azul flex items-center gap-2">
                  <QrCode size={20} /> Carnet Digital Oficial
                </h3>
                <button onClick={() => setModalCarnet(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="py-2">
                <CarnetDigitalCard jugador={jugador} equipo={inscripciones[0]?.equipo} />
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <button
                  onClick={() => window.print()}
                  className="bg-liga-azul text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center gap-2"
                >
                  <Printer size={16} /> Imprimir Carnet
                </button>
                <button
                  onClick={() => setModalCarnet(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Dar de baja */}
      {modalBaja && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalBaja(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={22} className="text-liga-rojo" /></div>
                <h3 className="text-lg font-bold text-liga-rojo">Dar de baja del equipo</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">¿Confirmas dar de baja a <strong>{jugador?.apellidos} {jugador?.nombres}</strong> del equipo <strong>{modalBaja.equipo.nombre} ({modalBaja.equipo.disciplina})</strong>?</p>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 text-xs text-yellow-800">El jugador seguirá activo en sus otras disciplinas. Esta acción solo inactiva esta inscripción.</div>
              <div className="flex gap-3">
                <button onClick={() => setModalBaja(null)} disabled={guardando} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarBaja} disabled={guardando} className="flex-1 bg-liga-rojo text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-rojo/90 disabled:opacity-50">{guardando ? 'Procesando...' : 'Confirmar baja'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {modalCarnet && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalCarnet(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-liga-azul flex items-center gap-2"><QrCode size={20} /> Carnet Digital Oficial</h3>
                <button onClick={() => setModalCarnet(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="py-2">
                <CarnetDigitalCard jugador={jugador} equipo={inscripciones[0]?.equipo} />
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <button onClick={() => window.print()} className="bg-liga-azul text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center gap-2"><Printer size={16} /> Imprimir</button>
                <button onClick={() => setModalCarnet(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50">Cerrar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}