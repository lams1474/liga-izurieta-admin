/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, CreditCard, AlertCircle, CheckCircle2, Search, RefreshCw, Plus, X, Save
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Pagos() {
  const [cargando, setCargando] = useState(true)
  const [pagaCarnets, setPagaCarnets] = useState([])
  const [deudasJugadores, setDeudasJugadores] = useState([])
  const [jugadoresList, setJugadoresList] = useState([])
  const [equiposList, setEquiposList] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [pestaña, setPestaña] = useState('carnets') // 'carnets' | 'deudas'

  // Modal Registrar Pago Carnet
  const [modalCarnetOpen, setModalCarnetOpen] = useState(false)
  const [formCarnet, setFormCarnet] = useState({ jugador_id: '', monto: 5.0, forma_pago: 'efectivo', observaciones: '' })
  const [guardandoCarnet, setGuardandoCarnet] = useState(false)

  // Modal Cobrar Deuda
  const [modalDeudaOpen, setModalDeudaOpen] = useState(false)
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null)
  const [montoCobro, setMontoCobro] = useState(0)
  const [guardandoDeuda, setGuardandoDeuda] = useState(false)

  // Modal Nueva Deuda / Cobro a Club o Jugador
  const [modalNuevaDeudaOpen, setModalNuevaDeudaOpen] = useState(false)
  const [formNuevaDeuda, setFormNuevaDeuda] = useState({
    destino: 'equipo', // 'equipo' | 'jugador'
    equipo_id: '',
    jugador_id: '',
    tipo_concepto: 'inscripcion_club', // 'inscripcion_club' | 'cuota_mensual' | 'cuota_anual' | 'multa_reglamento' | 'otro'
    concepto_personalizado: '',
    monto: 10.0,
    monto_pagado: 0,
  })
  const [guardandoNuevaDeuda, setGuardandoNuevaDeuda] = useState(false)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      // 1. Cargar pagos de carnet
      const { data: dataCarnets } = await supabase
        .from('pagos_carnet')
        .select(`
          id, monto, forma_pago, creado_en, observaciones,
          jugador:jugadores (id, nombres, apellidos, cedula, codigo_interno)
        `)
        .order('creado_en', { ascending: false })

      setPagaCarnets(dataCarnets || [])

      // 2. Cargar deudas pendientes
      const { data: dataDeudas } = await supabase
        .from('deudas_jugador')
        .select(`
          id, concepto, monto, monto_pagado, fecha_emision,
          jugador:jugadores (id, nombres, apellidos, cedula),
          equipo:equipos (nombre)
        `)
        .order('creado_en', { ascending: false })

      setDeudasJugadores(dataDeudas || [])

      // 3. Cargar lista de jugadores para el selector de pagos
      const { data: listJ } = await supabase
        .from('jugadores')
        .select('id, nombres, apellidos, cedula, carnet_pagado')
        .order('apellidos')
      setJugadoresList(listJ || [])

      // 4. Cargar lista de equipos/clubes
      const { data: listEq } = await supabase
        .from('equipos')
        .select('id, nombre, disciplina, categoria')
        .order('nombre')
      setEquiposList(listEq || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar historial de pagos')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  async function registrarPagoCarnet() {
    if (!formCarnet.jugador_id) {
      toast.error('Selecciona un jugador')
      return
    }

    setGuardandoCarnet(true)
    try {
      // 1. Insertar pago de carnet
      const { error: errPago } = await supabase.from('pagos_carnet').insert({
        jugador_id: formCarnet.jugador_id,
        monto: parseFloat(formCarnet.monto) || 5.0,
        forma_pago: formCarnet.forma_pago,
        observaciones: formCarnet.observaciones,
      })

      if (errPago) throw errPago

      // 2. Actualizar carnet_pagado = true en el jugador
      const { error: errJugador } = await supabase
        .from('jugadores')
        .update({ carnet_pagado: true })
        .eq('id', formCarnet.jugador_id)

      if (errJugador) throw errJugador

      toast.success('Pago de carnet registrado y jugador habilitado')
      setModalCarnetOpen(false)
      setFormCarnet({ jugador_id: '', monto: 5.0, forma_pago: 'efectivo', observaciones: '' })
      cargarDatos()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar pago: ' + err.message)
    } finally {
      setGuardandoCarnet(false)
    }
  }

  async function registrarCobroDeuda() {
    if (!deudaSeleccionada) return
    const cobro = parseFloat(montoCobro) || 0
    if (cobro <= 0) {
      toast.error('Ingresa un monto válido a cobrar')
      return
    }

    setGuardandoDeuda(true)
    try {
      const nuevoTotal = (deudaSeleccionada.monto_pagado || 0) + cobro

      const { error } = await supabase
        .from('deudas_jugador')
        .update({ monto_pagado: nuevoTotal })
        .eq('id', deudaSeleccionada.id)

      if (error) throw error

      toast.success('Cobro registrado correctamente')
      setModalDeudaOpen(false)
      setDeudaSeleccionada(null)
      cargarDatos()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar cobro: ' + err.message)
    } finally {
      setGuardandoDeuda(false)
    }
  }

  async function crearNuevaDeuda() {
    if (formNuevaDeuda.destino === 'equipo' && !formNuevaDeuda.equipo_id) {
      toast.error('Selecciona un equipo/club')
      return
    }
    if (formNuevaDeuda.destino === 'jugador' && !formNuevaDeuda.jugador_id) {
      toast.error('Selecciona un jugador')
      return
    }

    function obtenerConcepto() {
      if (formNuevaDeuda.tipo_concepto === 'otro') {
        return formNuevaDeuda.concepto_personalizado.trim() || 'Cobro Administrativo'
      }

      let base
      switch (formNuevaDeuda.tipo_concepto) {
        case 'inscripcion_club':
          base = 'Pago de Inscripción de Club / Torneo'
          break
        case 'cuota_mensual':
          base = 'Cuota Mensual de Participación'
          break
        case 'cuota_anual':
          base = 'Cuota Anual de Afiliación'
          break
        case 'multa_reglamento':
          base = 'Multa Reglamentaria Administrativa'
          break
        default:
          base = 'Cobro Administrativo'
          break
      }

      if (formNuevaDeuda.concepto_personalizado.trim()) {
        base += ` - ${formNuevaDeuda.concepto_personalizado.trim()}`
      }
      return base
    }

    const conceptoTexto = obtenerConcepto()

    const montoTotal = parseFloat(formNuevaDeuda.monto) || 0
    if (montoTotal <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setGuardandoNuevaDeuda(true)
    try {
      const payload = {
        concepto: conceptoTexto,
        monto: montoTotal,
        monto_pagado: parseFloat(formNuevaDeuda.monto_pagado) || 0,
        fecha_emision: new Date().toISOString().split('T')[0],
      }

      if (formNuevaDeuda.destino === 'equipo') {
        payload.equipo_id = formNuevaDeuda.equipo_id
      } else {
        payload.jugador_id = formNuevaDeuda.jugador_id
        // Asignar el equipo si el jugador pertenece a uno
        const jSel = jugadoresList.find((j) => j.id === formNuevaDeuda.jugador_id)
        if (jSel?.inscripciones?.[0]?.equipo_id) {
          payload.equipo_id = jSel.inscripciones[0].equipo_id
        }
      }

      const { error } = await supabase.from('deudas_jugador').insert(payload)

      if (error) throw error

      toast.success('Cobro registrado exitosamente')
      setModalNuevaDeudaOpen(false)
      setFormNuevaDeuda({
        destino: 'equipo',
        equipo_id: '',
        jugador_id: '',
        tipo_concepto: 'inscripcion_club',
        concepto_personalizado: '',
        monto: 10.0,
        monto_pagado: 0,
      })
      cargarDatos()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar cobro: ' + err.message)
    } finally {
      setGuardandoNuevaDeuda(false)
    }
  }

  const totalRecaudadoCarnets = pagaCarnets.reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalDeudasPendientes = deudasJugadores.reduce(
    (sum, d) => sum + ((d.monto || 0) - (d.monto_pagado || 0)),
    0
  )

  const carnetsFiltrados = pagaCarnets.filter((p) => {
    if (!busqueda) return true
    const txt = busqueda.toLowerCase()
    const nombre = `${p.jugador?.nombres} ${p.jugador?.apellidos}`.toLowerCase()
    return nombre.includes(txt) || p.jugador?.cedula?.includes(txt)
  })

  const deudasFiltradas = deudasJugadores.filter((d) => {
    if (!busqueda) return true
    const txt = busqueda.toLowerCase()
    const nombre = `${d.jugador?.nombres} ${d.jugador?.apellidos}`.toLowerCase()
    return nombre.includes(txt) || d.concepto?.toLowerCase().includes(txt)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="text-liga-azul" size={28} />
            Módulo de Pagos y Tesorería
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Control de cobros de carnets digitales, multas y deudas de la liga
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalNuevaDeudaOpen(true)}
            className="bg-liga-azul text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Registrar Cobro / Multa / Cuota
          </button>

          <button
            onClick={() => setModalCarnetOpen(true)}
            className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={18} /> Registrar Pago Carnet
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Recaudado (Carnets)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">${totalRecaudadoCarnets.toFixed(2)}</p>
          </div>
          <div className="w-11 h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Deudas Pendientes</p>
            <p className="text-2xl font-bold text-liga-rojo mt-1">${totalDeudasPendientes.toFixed(2)}</p>
          </div>
          <div className="w-11 h-11 bg-red-50 text-liga-rojo rounded-xl flex items-center justify-center">
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setPestaña('carnets')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            pestaña === 'carnets'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard size={18} />
          Pagos de Carnet Digital ({pagaCarnets.length})
        </button>

        <button
          onClick={() => setPestaña('deudas')}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            pestaña === 'deudas'
              ? 'border-liga-azul text-liga-azul'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertCircle size={18} />
          Deudas y Multas ({deudasJugadores.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por jugador o concepto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>

        <button
          onClick={cargarDatos}
          className="p-2 text-gray-600 hover:text-liga-azul rounded-lg hover:bg-gray-100 transition-colors"
          title="Recargar datos"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Contenido Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-liga-azul mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Cargando pagos...</p>
          </div>
        ) : pestaña === 'carnets' ? (
          carnetsFiltrados.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay pagos de carnet registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3.5">Jugador</th>
                    <th className="px-6 py-3.5">Cédula</th>
                    <th className="px-6 py-3.5">Monto</th>
                    <th className="px-6 py-3.5">Forma de Pago</th>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carnetsFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {p.jugador?.apellidos} {p.jugador?.nombres}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {p.jugador?.cedula || '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-green-600">
                        ${(p.monto || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 capitalize text-gray-700">
                        {p.forma_pago || 'efectivo'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(p.creado_en).toLocaleDateString('es-EC')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle2 size={13} /> Registrado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          deudasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay deudas ni multas pendientes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3.5">Jugador / Club</th>
                    <th className="px-6 py-3.5">Concepto</th>
                    <th className="px-6 py-3.5">Monto Total</th>
                    <th className="px-6 py-3.5">Saldo Pendiente</th>
                    <th className="px-6 py-3.5">Fecha Emisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deudasFiltradas.map((d) => {
                    const saldo = (d.monto || 0) - (d.monto_pagado || 0)
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          {d.jugador ? (
                            <>
                              <div className="font-semibold text-gray-900">
                                {d.jugador?.apellidos} {d.jugador?.nombres}
                              </div>
                              <div className="text-xs text-gray-500">
                                Club: {d.equipo?.nombre || '—'}
                              </div>
                            </>
                          ) : (
                            <div className="font-bold text-liga-azul">
                              🏰 {d.equipo?.nombre || 'Club General'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {d.concepto}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          ${(d.monto || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-bold text-liga-rojo">
                          ${saldo.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {d.fecha_emision || '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {saldo > 0 ? (
                            <button
                              onClick={() => {
                                setDeudaSeleccionada(d)
                                setMontoCobro(saldo)
                                setModalDeudaOpen(true)
                              }}
                              className="px-3 py-1 bg-liga-azul text-white rounded text-xs font-semibold hover:bg-blue-800"
                            >
                              Cobrar
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                              Saldada
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL: Registrar Pago Carnet */}
      {modalCarnetOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalCarnetOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                  <CreditCard size={20} /> Registrar Pago de Carnet Digital
                </h3>
                <button onClick={() => setModalCarnetOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Jugador <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCarnet.jugador_id}
                    onChange={(e) => setFormCarnet({ ...formCarnet, jugador_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    <option value="">Seleccionar jugador...</option>
                    {jugadoresList.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.apellidos} {j.nombres} ({j.cedula}) - {j.carnet_pagado ? '✅ Pagado' : '❌ Pendiente'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Monto ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formCarnet.monto}
                      onChange={(e) => setFormCarnet({ ...formCarnet, monto: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Forma de Pago
                    </label>
                    <select
                      value={formCarnet.forma_pago}
                      onChange={(e) => setFormCarnet({ ...formCarnet, forma_pago: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="deposito">Depósito</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Observaciones / Comprobante
                  </label>
                  <input
                    type="text"
                    value={formCarnet.observaciones}
                    onChange={(e) => setFormCarnet({ ...formCarnet, observaciones: e.target.value })}
                    placeholder="Ej. Transferencia Banco Pichincha #12345"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => setModalCarnetOpen(false)}
                  disabled={guardandoCarnet}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarPagoCarnet}
                  disabled={guardandoCarnet}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> {guardandoCarnet ? 'Guardando...' : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Registrar Nueva Deuda / Cobro */}
      {modalNuevaDeudaOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalNuevaDeudaOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-liga-azul flex items-center gap-2">
                  <DollarSign size={20} /> Registrar Nuevo Cobro / Multa
                </h3>
                <button onClick={() => setModalNuevaDeudaOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Dirigido A
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormNuevaDeuda({ ...formNuevaDeuda, destino: 'equipo' })}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        formNuevaDeuda.destino === 'equipo'
                          ? 'bg-liga-azul text-white border-liga-azul'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      🏰 Equipo / Club
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormNuevaDeuda({ ...formNuevaDeuda, destino: 'jugador' })}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        formNuevaDeuda.destino === 'jugador'
                          ? 'bg-liga-azul text-white border-liga-azul'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      👤 Jugador
                    </button>
                  </div>
                </div>

                {formNuevaDeuda.destino === 'equipo' ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Seleccionar Equipo / Club <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formNuevaDeuda.equipo_id}
                      onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, equipo_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                    >
                      <option value="">Seleccionar club...</option>
                      {equiposList.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.nombre} ({eq.disciplina} - {eq.categoria})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Seleccionar Jugador <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formNuevaDeuda.jugador_id}
                      onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, jugador_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                    >
                      <option value="">Seleccionar jugador...</option>
                      {jugadoresList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.apellidos} {j.nombres} ({j.cedula})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Tipo de Concepto
                  </label>
                  <select
                    value={formNuevaDeuda.tipo_concepto}
                    onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, tipo_concepto: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  >
                    <option value="inscripcion_club">Pago de Inscripción de Club / Torneo</option>
                    <option value="cuota_mensual">Cuota Mensual de Participación</option>
                    <option value="cuota_anual">Cuota Anual de Afiliación</option>
                    <option value="multa_reglamento">Multa Reglamentaria Administrativa</option>
                    <option value="otro">Otro Concepto Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Detalle / Observación
                  </label>
                  <input
                    type="text"
                    value={formNuevaDeuda.concepto_personalizado}
                    onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, concepto_personalizado: e.target.value })}
                    placeholder="Ej. Torneo Apertura 2025 - Fecha 3"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Monto Total ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formNuevaDeuda.monto}
                      onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, monto: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Abono / Pago Inicial ($)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={formNuevaDeuda.monto}
                      value={formNuevaDeuda.monto_pagado}
                      onChange={(e) => setFormNuevaDeuda({ ...formNuevaDeuda, monto_pagado: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => setModalNuevaDeudaOpen(false)}
                  disabled={guardandoNuevaDeuda}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearNuevaDeuda}
                  disabled={guardandoNuevaDeuda}
                  className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> {guardandoNuevaDeuda ? 'Guardando...' : 'Registrar Cobro'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Cobrar Deuda */}
      {modalDeudaOpen && deudaSeleccionada && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setModalDeudaOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-liga-azul flex items-center gap-2">
                  <DollarSign size={20} /> Registrar Cobro de Deuda / Multa
                </h3>
                <button onClick={() => setModalDeudaOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Jugador:</strong> {deudaSeleccionada.jugador?.apellidos} {deudaSeleccionada.jugador?.nombres}</p>
                <p><strong>Concepto:</strong> {deudaSeleccionada.concepto}</p>
                <p><strong>Monto Total:</strong> ${deudaSeleccionada.monto?.toFixed(2)}</p>
                <p><strong>Saldo Pendiente:</strong> ${((deudaSeleccionada.monto || 0) - (deudaSeleccionada.monto_pagado || 0)).toFixed(2)}</p>

                <div className="pt-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Monto a Acreditar ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={(deudaSeleccionada.monto || 0) - (deudaSeleccionada.monto_pagado || 0)}
                    value={montoCobro}
                    onChange={(e) => setMontoCobro(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => setModalDeudaOpen(false)}
                  disabled={guardandoDeuda}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarCobroDeuda}
                  disabled={guardandoDeuda}
                  className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save size={16} /> {guardandoDeuda ? 'Procesando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}