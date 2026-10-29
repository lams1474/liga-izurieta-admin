/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, TrendingUp, AlertTriangle, Users, Trophy, Target, ShieldCheck, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Reportes() {
  const [cargando, setCargando] = useState(true)
  const [data, setData] = useState({
    ingresosCarnets: 0,
    ingresosMultas: 0,
    deudasPendientes: 0,
    partidosJugados: 0,
    golesTotales: 0,
    totalEquipos: 0,
    totalJugadores: 0,
    jugadoresCalificados: 0,
  })

  async function cargarReportes() {
    setCargando(true)
    try {
      // 1. Cargar datos financieros
      const { data: pagos } = await supabase.from('pagos_carnet').select('monto')
      const { data: deudasJug } = await supabase.from('deudas_jugador').select('monto, monto_pagado')
      const { data: deudasEq } = await supabase.from('deudas_equipo').select('monto, monto_pagado')

      const ingresosCarnets = (pagos || []).reduce((sum, p) => sum + Number(p.monto), 0)

      const ingresosMultasJug = (deudasJug || []).reduce((sum, d) => sum + Number(d.monto_pagado), 0)
      const ingresosMultasEq = (deudasEq || []).reduce((sum, d) => sum + Number(d.monto_pagado), 0)
      const ingresosMultas = ingresosMultasJug + ingresosMultasEq

      const deudasJugPend = (deudasJug || []).reduce((sum, d) => sum + (Number(d.monto) - Number(d.monto_pagado)), 0)
      const deudasEqPend = (deudasEq || []).reduce((sum, d) => sum + (Number(d.monto) - Number(d.monto_pagado)), 0)
      const deudasPendientes = deudasJugPend + deudasEqPend

      // 2. Cargar estadísticas generales
      const { count: partidosJugados } = await supabase.from('partidos').select('*', { count: 'exact', head: true }).eq('jugado', true)
      const { count: golesTotales } = await supabase.from('goles').select('*', { count: 'exact', head: true })
      const { count: totalEquipos } = await supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('activo', true)

      // 3. Cargar estado de jugadores
      const { data: jugadores } = await supabase.from('jugadores').select('id, calificado').eq('activo', true)
      const totalJugadores = (jugadores || []).length
      const jugadoresCalificados = (jugadores || []).filter(j => j.calificado).length

      setData({
        ingresosCarnets,
        ingresosMultas,
        deudasPendientes,
        partidosJugados: partidosJugados || 0,
        golesTotales: golesTotales || 0,
        totalEquipos: totalEquipos || 0,
        totalJugadores,
        jugadoresCalificados,
      })

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar los reportes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  if (cargando) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-liga-azul mx-auto"></div>
        <p className="mt-4 text-gray-500 font-semibold">Generando reportes...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-liga-azul">Reportes y Estadísticas</h1>
          <p className="text-gray-500 mt-1">Resumen general de la liga en tiempo real</p>
        </div>
        <button
          onClick={cargarReportes}
          className="text-sm bg-white text-liga-azul border border-liga-azul px-4 py-2 rounded-md font-semibold hover:bg-gray-50 transition-colors"
        >
          Actualizar Datos
        </button>
      </div>

      {/* SECCIÓN: FINANZAS */}
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <DollarSign size={20} className="text-green-600" /> Resumen Financiero
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {/* Ingresos Carnets */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500">Ingresos por Carnets</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">${data.ingresosCarnets.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Ingresos Multas */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500">Ingresos por Multas</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">${data.ingresosMultas.toFixed(2)}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Deudas Pendientes */}
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500">Deudas Pendientes</p>
              <p className="text-3xl font-bold text-red-600 mt-2">${data.deudasPendientes.toFixed(2)}</p>
            </div>
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: ESTADÍSTICAS DEL TORNEO */}
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-500" /> Estadísticas del Torneo
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        {/* Partidos Jugados */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={24} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.partidosJugados}</p>
          <p className="text-xs text-gray-500 font-semibold">Partidos Jugados</p>
        </div>

        {/* Goles Totales */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target size={24} className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.golesTotales}</p>
          <p className="text-xs text-gray-500 font-semibold">Goles Anotados</p>
        </div>

        {/* Total Equipos */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={24} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.totalEquipos}</p>
          <p className="text-xs text-gray-500 font-semibold">Equipos Activos</p>
        </div>

        {/* Total Jugadores */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={24} className="text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{data.totalJugadores}</p>
          <p className="text-xs text-gray-500 font-semibold">Jugadores Registrados</p>
        </div>
      </div>

      {/* SECCIÓN: ESTADO DE JUGADORES */}
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Users size={20} className="text-liga-azul" /> Estado de Calificación
      </h2>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">

          {/* Barra de progreso circular o lineal */}
          <div className="flex-1 w-full">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-green-600">Calificados ({data.jugadoresCalificados})</span>
              <span className="text-red-600">No Calificados ({data.totalJugadores - data.jugadoresCalificados})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden flex">
              <div
                className="bg-green-500 h-4"
                style={{ width: `${(data.jugadoresCalificados / data.totalJugadores) * 100 || 0}%` }}
              ></div>
              <div
                className="bg-red-500 h-4"
                style={{ width: `${((data.totalJugadores - data.jugadoresCalificados) / data.totalJugadores) * 100 || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              El {((data.jugadoresCalificados / data.totalJugadores) * 100 || 0).toFixed(1)}% de los jugadores registrados están habilitados para jugar.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}