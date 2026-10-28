import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FileSpreadsheet, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable' // <-- CAMBIO AQUÍ (Importación directa)
import toast from 'react-hot-toast'

export default function MiNomina() {
  const { usuario } = useAuth()
  const [jugadores, setJugadores] = useState([])
  const [club, setClub] = useState(null)
  const [cargando, setCargando] = useState(true)

  const clubId = usuario?.club_id

  // Cargar datos
  useEffect(() => {
    async function cargarDatos() {
      if (!clubId) {
        setCargando(false)
        return
      }

      try {
        // Cargar info del club
        const { data: clubData } = await supabase
          .from('equipos')
          .select('nombre, disciplina, categoria')
          .eq('id', clubId)
          .single()
        setClub(clubData)

        // Cargar jugadores
        const { data: jugadoresData, error } = await supabase
          .from('jugador_equipo')
          .select(`
            id,
            dorsal,
            jugador:jugadores!jugador_equipo_jugador_id_fkey (
              codigo_interno, apellidos, nombres, cedula,
              estado_pase, calificado, carnet_pagado,
              foto_actualizada, consentimiento_firmado
            )
          `)
          .eq('equipo_id', clubId)
          .eq('activo', true)

        if (error) throw error

        const lista = (jugadoresData || [])
          .filter((i) => i.jugador)
          .map((i) => ({
            ...i.jugador,
            dorsal: i.dorsal || '-'
          }))
          .sort((a, b) => a.apellidos.localeCompare(b.apellidos))

        setJugadores(lista)
      } catch (err) {
        console.error(err)
        toast.error('Error al cargar la nómina')
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [clubId])

  // Calcular estado general de un jugador
  const obtenerEstado = (j) => {
    if (!j.foto_actualizada) return 'Sin foto'
    if (!j.consentimiento_firmado) return 'Sin LOPDP'
    if (!j.carnet_pagado) return 'Sin carnet'
    if (j.estado_pase !== 'aprobado') return 'Pase pendiente'
    if (!j.calificado) return 'Sin calificar'
    return 'Calificado'
  }

  // Contadores
  const total = jugadores.length
  const calificados = jugadores.filter(j => obtenerEstado(j) === 'Calificado').length
  const noCalificados = total - calificados

  // ============ EXPORTAR A EXCEL ============
  function exportarExcel() {
    try {
      const datos = jugadores.map((j) => ({
        'Código': j.codigo_interno,
        'Apellidos': j.apellidos,
        'Nombres': j.nombres,
        'Cédula': j.cedula,
        'Dorsal': j.dorsal,
        'Pase': j.estado_pase,
        'Carnet Pagado': j.carnet_pagado ? 'SÍ' : 'NO',
        'Foto': j.foto_actualizada ? 'SÍ' : 'NO',
        'LOPDP': j.consentimiento_firmado ? 'SÍ' : 'NO',
        'Estado Final': obtenerEstado(j),
      }))

      const hoja = XLSX.utils.json_to_sheet(datos)
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Nómina')

      hoja['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 8 },
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
      ]

      const nombreClub = club?.nombre ? club.nombre.replace(/\s+/g, '_') : 'Liga'
      XLSX.writeFile(libro, `Nomina_${nombreClub}.xlsx`)
      toast.success('Excel descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar Excel')
    }
  }

  // ============ EXPORTAR A PDF ============
  function exportarPDF() {
    try {
      const doc = new jsPDF()

      const nombreClub = club?.nombre || 'CLUB'
      const disciplina = club?.disciplina ? club.disciplina.toUpperCase() : 'N/A'
      const categoria = club?.categoria ? club.categoria.toUpperCase() : 'N/A'

      // Encabezado
      doc.setFontSize(16)
      doc.setTextColor(30, 58, 138) // Azul liga
      doc.text('LIGA DEPORTIVA BARRIAL JOSE IGNACIO IZURIETA', 14, 20)

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text(`NOMINA DE JUGADORES - ${nombreClub}`, 14, 30)

      doc.setFontSize(10)
      doc.text(`Disciplina: ${disciplina} | Categoria: ${categoria}`, 14, 37)
      doc.text(`Fecha de emision: ${new Date().toLocaleDateString('es-EC')}`, 14, 43)

      // Tabla
      const filas = jugadores.map(j => [
        j.dorsal,
        j.codigo_interno,
        `${j.apellidos} ${j.nombres}`,
        j.cedula,
        obtenerEstado(j)
      ])

      // USO CORRECTO DE AUTOTABLE EN VERSIONES NUEVAS
      autoTable(doc, {
        startY: 50,
        head: [['Dorsal', 'Código', 'Jugador', 'Cédula', 'Estado']],
        body: filas,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] }, // Azul liga
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 70 },
          3: { cellWidth: 30 },
          4: { cellWidth: 40 }
        }
      })

      doc.save(`Nomina_${nombreClub.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar PDF')
    }
  }

  // ============ RENDER ============

  if (!clubId) {
    return (
      <div className="max-w-4xl">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-yellow-800 mb-2">No tienes un club asignado</h2>
              <p className="text-sm text-yellow-700">Contacta al administrador.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liga-azul mx-auto"></div>
        <p className="mt-4 text-gray-500">Generando nómina...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Mi Nómina</h1>
          <p className="text-gray-500 text-sm mt-1">
            Descarga la lista oficial de tu plantilla
          </p>
        </div>

        {/* Botones de Descarga */}
        <div className="flex gap-2">
          <button
            onClick={exportarExcel}
            disabled={jugadores.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors text-sm"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button
            onClick={exportarPDF}
            disabled={jugadores.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors text-sm"
          >
            <FileText size={18} />
            PDF
          </button>
        </div>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{club?.nombre}</h2>
            <p className="text-sm text-gray-500 capitalize">{club?.disciplina} · {club?.categoria}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Jugadores</p>
            <p className="text-3xl font-bold text-liga-azul">{total}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="font-semibold">{calificados} Calificados</span>
          </div>
          <div className="flex items-center gap-2 text-red-600">
            <XCircle size={20} />
            <span className="font-semibold">{noCalificados} No Calificados</span>
          </div>
        </div>
      </div>

      {/* Tabla de jugadores */}
      {jugadores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">No hay jugadores registrados aún.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-liga-azul text-white">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Dorsal</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Jugador</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Cédula</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">Pase</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => {
                  const estado = obtenerEstado(j)
                  const esCalificado = estado === 'Calificado'

                  return (
                    <tr key={j.cedula} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 text-center font-bold text-gray-700">
                        {j.dorsal}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-800 text-sm">
                          {j.apellidos} {j.nombres}
                        </div>
                        <div className="text-xs text-gray-500">{j.codigo_interno}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 font-mono">
                        {j.cedula}
                      </td>
                      <td className="px-3 py-3 text-sm capitalize">
                        {j.estado_pase}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          esCalificado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {estado}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}