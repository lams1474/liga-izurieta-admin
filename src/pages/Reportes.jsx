import { useState } from 'react'
import { FileText, Printer, Award, Shield, Users, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Reportes() {
  const [reporteSeleccionado, setReporteSeleccionado] = useState('nominas')

  function imprimirReporte(titulo) {
    toast.success(`Generando reporte de ${titulo} para impresión...`)
    window.print()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-liga-azul" size={28} />
            Módulo de Reportes e Impresiones
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Generación de listas de buena fe, nóminas de clubes, goleadores y planillas impresas
          </p>
        </div>
      </div>

      {/* Tarjetas de Accesos Rápidos a Reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setReporteSeleccionado('nominas')}
          className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            reporteSeleccionado === 'nominas'
              ? 'bg-liga-azul text-white border-liga-azul shadow-md'
              : 'bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <Users size={24} className={reporteSeleccionado === 'nominas' ? 'text-liga-amarillo' : 'text-liga-azul'} />
          <div className="mt-4">
            <h3 className="font-bold text-base">Nóminas de Equipos</h3>
            <p className="text-xs opacity-80 mt-1">Listas de buena fe aprobadas por club</p>
          </div>
        </button>

        <button
          onClick={() => setReporteSeleccionado('goleadores')}
          className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            reporteSeleccionado === 'goleadores'
              ? 'bg-liga-azul text-white border-liga-azul shadow-md'
              : 'bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <Award size={24} className={reporteSeleccionado === 'goleadores' ? 'text-liga-amarillo' : 'text-amber-500'} />
          <div className="mt-4">
            <h3 className="font-bold text-base">Tabla de Goleadores</h3>
            <p className="text-xs opacity-80 mt-1">Estadística por categoría y disciplina</p>
          </div>
        </button>

        <button
          onClick={() => setReporteSeleccionado('sanciones')}
          className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            reporteSeleccionado === 'sanciones'
              ? 'bg-liga-azul text-white border-liga-azul shadow-md'
              : 'bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <AlertTriangle size={24} className={reporteSeleccionado === 'sanciones' ? 'text-liga-amarillo' : 'text-liga-rojo'} />
          <div className="mt-4">
            <h3 className="font-bold text-base">Sancionados</h3>
            <p className="text-xs opacity-80 mt-1">Jugadores suspendidos para la fecha</p>
          </div>
        </button>

        <button
          onClick={() => setReporteSeleccionado('posiciones')}
          className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between ${
            reporteSeleccionado === 'posiciones'
              ? 'bg-liga-azul text-white border-liga-azul shadow-md'
              : 'bg-white text-gray-800 border-gray-100 hover:border-gray-200 shadow-sm'
          }`}
        >
          <Shield size={24} className={reporteSeleccionado === 'posiciones' ? 'text-liga-amarillo' : 'text-green-600'} />
          <div className="mt-4">
            <h3 className="font-bold text-base">Tabla de Posiciones</h3>
            <p className="text-xs opacity-80 mt-1">Puntos, GD y Fair Play general</p>
          </div>
        </button>
      </div>

      {/* Contenido del Reporte */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 uppercase">
              {reporteSeleccionado === 'nominas' && 'Reporte: Nóminas Oficiales de Jugadores'}
              {reporteSeleccionado === 'goleadores' && 'Reporte: Máximos Goleadores'}
              {reporteSeleccionado === 'sanciones' && 'Reporte: Jugadores Inhabilitados / Sancionados'}
              {reporteSeleccionado === 'posiciones' && 'Reporte: Tabla General de Posiciones'}
            </h2>
            <p className="text-xs text-gray-500">Liga Deportiva Barrial José Ignacio Izurieta - Temporada 2026-2027</p>
          </div>

          <button
            onClick={() => imprimirReporte(reporteSeleccionado)}
            className="bg-liga-azul text-white px-4 py-2 rounded-lg font-semibold hover:bg-liga-azul/90 transition-colors flex items-center gap-2 text-sm"
          >
            <Printer size={16} /> Imprimir Reporte
          </button>
        </div>

        <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">Reporte Oficial Listo para Exportación</p>
          <p className="text-xs text-gray-500 mt-1">
            Haz clic en "Imprimir Reporte" para generar el documento en formato PDF o físico.
          </p>
        </div>
      </div>
    </div>
  )
}