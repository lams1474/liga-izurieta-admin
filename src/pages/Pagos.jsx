/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, CreditCard, AlertCircle, CheckCircle2, Search, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Pagos() {
  const [cargando, setCargando] = useState(true)
  const [pagaCarnets, setPagaCarnets] = useState([])
  const [deudasJugadores, setDeudasJugadores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [pestaña, setPestaña] = useState('carnets') // 'carnets' | 'deudas'

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
                          <div className="font-semibold text-gray-900">
                            {d.jugador?.apellidos} {d.jugador?.nombres}
                          </div>
                          <div className="text-xs text-gray-500">
                            {d.equipo?.nombre || 'General'}
                          </div>
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}