/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'
import { FileCheck, CheckCircle2, Clock, Lock, Eye, X, Calendar, MapPin, UserCheck, Shield, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Actas() {
  const { usuario } = useAuth()

  const [pestana, setPestana] = useState('pendientes')
  const [actas, setActas] = useState([])
  const [cargando, setCargando] = useState(true)

  const esCapitan = usuario?.rol === 'capitan'

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
            id, hora, cancha, goles_local, goles_visitante,
            vocal:usuarios!vocal_id (nombres, apellidos),
            arbitro:arbitros!arbitro_id (nombres, apellidos),
            fecha:fechas (fecha_inicio),
            equipo_local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
            equipo_visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre, disciplina, categoria),
            planilla:planilla_partido (
              equipo_id, dorsal, es_titular, es_capitan,
              jugador:jugadores (id, nombres, apellidos)
            ),
            faltas:faltas_partido (
              id, tipo, minuto, equipo_id,
              jugador:jugadores (id, nombres, apellidos)
            ),
            goles:goles (
              id, minuto,
              jugador:jugadores (id, nombres, apellidos)
            )
          ),
          firmas:firmas_acta (firmante_tipo, firma_digital)
        `)
        .order('creado_en', { ascending: false })

      if (error) throw error
      
      // Obtener nombres de vocal y arbitro
      const actasConNombres = await Promise.all((data || []).map(async (acta) => {
        let nombreVocal = '____________________'
        let nombreArbitro = '____________________'
        if (acta.partido?.vocal_id) {
          const { data: v } = await supabase.from('usuarios').select('nombres, apellidos').eq('id', acta.partido.vocal_id).single()
          if (v) nombreVocal = `${v.nombres} ${v.apellidos}`
        }
        if (acta.partido?.arbitro_id) {
          const { data: a } = await supabase.from('arbitros').select('nombres, apellidos').eq('id', acta.partido.arbitro_id).single()
          if (a) nombreArbitro = `${a.nombres} ${a.apellidos}`
        }
        return { ...acta, nombreVocal, nombreArbitro }
      }))

      setActas(actasConNombres)
    } catch (err) {
      console.error("Error cargando actas:", err)
      toast.error(err.message || 'Error al cargar actas de partido')
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

  function descargarPDF(acta) {
    try {
      const doc = new jsPDF()
      const p = acta.partido
      console.log("Datos del acta:", acta);
      console.log("Firmas:", acta.firmas);
      console.log("Planilla:", acta.partido?.planilla);
      console.log("Faltas:", acta.partido?.faltas);
      console.log("Goles:", acta.partido?.goles);
      
      // Limpiador profundo para evitar los símbolos raros (...)
      const sanitize = (s) => {
        if (!s) return '';
        return String(s)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ñ/g, 'n')
          .replace(/Ñ/g, 'N')
          .replace(/[^\u0000-\u007F]/g, "") // Elimina cualquier caracter no ASCII
          .trim();
      }

      const dibujarEncabezado = (pagina) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(14)
        doc.text('LIGA DEPORTIVA BARRIAL JOSE I. IZURIETA', 105, 15, { align: 'center' })
        doc.setFontSize(9); doc.setFont("helvetica", "normal")
        doc.text('PUJILI - ECUADOR', 105, 20, { align: 'center' })
        doc.text('FUNDADA EL 09 DE MARZO DEL 2013', 20, 26)
        doc.text('ACUERDO MUNICIPAL NO. 034-GADMP-2013', 130, 26)
        doc.line(15, 28, 195, 28)
        doc.setFont("helvetica", "bold"); doc.setFontSize(12)
        doc.text(`ACTA DE JUEGO - PAGINA ${pagina}`, 105, 35, { align: 'center' })
      }

      dibujarEncabezado(1)
      doc.setFontSize(9); doc.setFont("helvetica", "normal")
      
      const fechaStr = p.fecha?.fecha_inicio ? new Date(p.fecha.fecha_inicio + 'T00:00:00').toLocaleDateString('es-EC') : '--/--/----'
      const nombreVocal = p.vocal ? `${p.vocal.nombres} ${p.vocal.apellidos}` : '____________________'
      const nombreArbitro = p.arbitro ? `${p.arbitro.nombres} ${p.arbitro.apellidos}` : '____________________'

      doc.text(`VOCAL DE TURNO: ${sanitize(nombreVocal)}`, 15, 45)
      doc.text(`CIUDAD: Pujili`, 100, 45)
      doc.text(`FECHA: ${fechaStr}`, 145, 45)
      doc.text(`HORA: ${p.hora?.slice(0,5) || '________'}`, 15, 51)
      doc.text(`ARBITRO: ${sanitize(nombreArbitro)}`, 100, 51)

      // Forzar arrays
      const planilla = Array.isArray(p.planilla) ? p.planilla : (p.planilla ? [p.planilla] : [])
      const faltas = Array.isArray(p.faltas) ? p.faltas : (p.faltas ? [p.faltas] : [])
      const goles = Array.isArray(p.goles) ? p.goles : (p.goles ? [p.goles] : [])

      // TABLA LOCAL
      doc.setFont("helvetica", "bold")
      doc.text(`CLUB: ${sanitize(p.equipo_local?.nombre?.toUpperCase())}`, 15, 60)
      doc.text(`CATEGORIA: ${sanitize(p.equipo_local?.categoria?.toUpperCase())}`, 100, 60)

      const jugadoresLocales = planilla.filter(pl => pl.equipo_id === p.equipo_local?.id)
      const filasLocal = jugadoresLocales.map(j => {
        const g = goles.filter(x => x.jugador?.id === j.jugador?.id).length
        const a = faltas.filter(x => x.jugador?.id === j.jugador?.id && x.tipo === 'amarilla').length
        const r = faltas.filter(x => x.jugador?.id === j.jugador?.id && x.tipo === 'roja').length
        return [j.dorsal || '-', sanitize(`${j.jugador?.apellidos} ${j.jugador?.nombres}`), g > 0 ? g : '', a > 0 ? 'X' : '', r > 0 ? 'X' : '']
      })

      autoTable(doc, {
        startY: 63, head: [['NO.', 'NOMBRES DE JUGADORES', 'GOL', 'T.A.', 'T.R.']], body: filasLocal, theme: 'grid',
        headStyles: { fillColor: [200,200,200], textColor: [0,0,0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica' },
        columnStyles: { 0:{cellWidth:15,halign:'center'}, 1:{cellWidth:110}, 2:{cellWidth:15,halign:'center'}, 3:{cellWidth:15,halign:'center'}, 4:{cellWidth:15,halign:'center'} }
      })

      // TABLA VISITANTE
      let finalY = doc.lastAutoTable.finalY + 10
      doc.setFont("helvetica", "bold")
      doc.text(`CLUB: ${sanitize(p.equipo_visitante?.nombre?.toUpperCase())}`, 15, finalY)
      doc.text(`CATEGORIA: ${sanitize(p.equipo_visitante?.categoria?.toUpperCase())}`, 100, finalY)

      const jugadoresVisitantes = planilla.filter(pl => pl.equipo_id === p.equipo_visitante?.id)
      const filasVisitante = jugadoresVisitantes.map(j => {
        const g = goles.filter(x => x.jugador?.id === j.jugador?.id).length
        const a = faltas.filter(x => x.jugador?.id === j.jugador?.id && x.tipo === 'amarilla').length
        const r = faltas.filter(x => x.jugador?.id === j.jugador?.id && x.tipo === 'roja').length
        return [j.dorsal || '-', sanitize(`${j.jugador?.apellidos} ${j.jugador?.nombres}`), g > 0 ? g : '', a > 0 ? 'X' : '', r > 0 ? 'X' : '']
      })

      autoTable(doc, {
        startY: finalY + 3, head: [['NO.', 'NOMBRES DE JUGADORES', 'GOL', 'T.A.', 'T.R.']], body: filasVisitante, theme: 'grid',
        headStyles: { fillColor: [200,200,200], textColor: [0,0,0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica' },
        columnStyles: { 0:{cellWidth:15,halign:'center'}, 1:{cellWidth:110}, 2:{cellWidth:15,halign:'center'}, 3:{cellWidth:15,halign:'center'}, 4:{cellWidth:15,halign:'center'} }
      })

      // PAGINA 2 (Tarjetas y Firmas)
      doc.addPage(); dibujarEncabezado(2); doc.setFontSize(9); doc.setFont("helvetica", "normal")
      
      let nextY = 45
      const tarjetasLocal = faltas.filter(f => f.equipo_id === p.equipo_local?.id && (f.tipo === 'amarilla' || f.tipo === 'roja'))
      const tarjetasVisitante = faltas.filter(f => f.equipo_id === p.equipo_visitante?.id && (f.tipo === 'amarilla' || f.tipo === 'roja'))

      const dibujarTarjetas = (startY, nombreClub, tarjetas) => {
        doc.setFont("helvetica", "bold")
        doc.text(`TARJETAS DEL CLUB: ${sanitize(nombreClub?.toUpperCase())}`, 15, startY)
        let y = startY + 6
        doc.setFont("helvetica", "normal")
        if(tarjetas.length === 0) {
           doc.text('Sin tarjetas registradas.', 15, y)
           return y + 10
        }
        tarjetas.forEach((t, i) => {
           // Buscamos el dorsal del jugador en la planilla de su equipo
           const jugadorEnPlanilla = planilla.find(pl => pl.jugador?.id === t.jugador?.id)
           const dorsal = jugadorEnPlanilla ? jugadorEnPlanilla.dorsal : '-'
           
           doc.text(`MIN ${t.minuto || 0}: ${sanitize(t.jugador?.apellidos)} ${sanitize(t.jugador?.nombres)} (${t.tipo.toUpperCase()}) - DORSAL ${dorsal}`, 15, y + (i*6))
        })
        return y + (tarjetas.length * 6) + 10
      }

      nextY = dibujarTarjetas(nextY, p.equipo_local?.nombre, tarjetasLocal)
      nextY = dibujarTarjetas(nextY, p.equipo_visitante?.nombre, tarjetasVisitante)

      doc.setFont("helvetica", "bold"); doc.text('NOVEDADES:', 15, nextY); doc.setFont("helvetica", "normal")
      const splitText = doc.splitTextToSize(sanitize(acta.observaciones || 'Sin novedades.'), 175)
      doc.text(splitText, 15, nextY + 6)
      
      let lineY = nextY + 6 + (splitText.length * 5) + 10
      const firmaY = lineY + 85 

      const firmas = Array.isArray(acta.firmas) ? acta.firmas : (acta.firmas ? [acta.firmas] : [])
      const fArbitro = firmas.find(f => f.firmante_tipo === 'arbitro')
      const fCapLocal = firmas.find(f => f.firmante_tipo === 'local')
      const fCapVisitante = firmas.find(f => f.firmante_tipo === 'visitante')
      const fVocal = firmas.find(f => f.firmante_tipo === 'vocal')

      const capLocalPlan = planilla.find(pl => pl.es_capitan && pl.equipo_id === p.equipo_local?.id)
      const capVisitPlan = planilla.find(pl => pl.es_capitan && pl.equipo_id === p.equipo_visitante?.id)
      const nombreCapLocal = capLocalPlan ? `${capLocalPlan.jugador?.apellidos} ${capLocalPlan.jugador?.nombres}` : ''
      const nombreCapVisit = capVisitPlan ? `${capVisitPlan.jugador?.apellidos} ${capVisitPlan.jugador?.nombres}` : ''

      const drawImageSafely = (base64, x, y, w, h) => {
        try { 
          if (base64) {
            const cleanB64 = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '').replace(/\s/g, '');
            doc.addImage(cleanB64, "PNG", x, y, w, h, undefined, 'FAST') 
          }
        } catch (e) { console.error("Error dibujando firma:", e) }
      }

      const xPositions = [15, 65, 115, 165]
      const firmantes = [
        { nombre: `CAPITAN ${sanitize(p.equipo_local?.nombre?.toUpperCase())}`, firma: fCapLocal, persona: nombreCapLocal },
        { nombre: `CAPITAN ${sanitize(p.equipo_visitante?.nombre?.toUpperCase())}`, firma: fCapVisitante, persona: nombreCapVisit },
        { nombre: 'ARBITRO', firma: fArbitro, persona: sanitize(nombreArbitro) },
        { nombre: 'VOCAL', firma: fVocal, persona: sanitize(nombreVocal) }
      ]

      firmantes.forEach((item, index) => {
        const x = xPositions[index]
        drawImageSafely(item.firma?.firma_digital, x, firmaY - 20, 30, 15)
        doc.line(x, firmaY, x + 30, firmaY)
        doc.setFontSize(7); doc.setFont("helvetica", "bold")
        doc.text(item.nombre, x + 15, firmaY + 4, { align: 'center' })
        if (item.persona) { 
          doc.setFont("helvetica", "normal"); doc.setFontSize(6); 
          doc.text(sanitize(item.persona), x + 15, firmaY + 8, { align: 'center' }) 
        }
      })

      doc.save(`acta-${p.equipo_local?.nombre}-vs-${p.equipo_visitante?.nombre}.pdf`)
    } catch (err) { 
      console.error('Error generando PDF:', err)
      toast.error('Error al generar el acta PDF') 
    }
  }

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

              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-liga-azul" />
                  <div>
                    <p className="font-semibold text-gray-500 uppercase">Fecha y Hora</p>
                    <p className="font-bold text-gray-900">{actaSeleccionada.partido?.fecha?.fecha_inicio ? new Date(actaSeleccionada.partido.fecha.fecha_inicio + 'T00:00:00').toLocaleDateString('es-EC') : 'Sin fecha'} · {actaSeleccionada.partido?.hora?.substring(0, 5) || '--:--'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-liga-azul" />
                  <div>
                    <p className="font-semibold text-gray-500 uppercase">Lugar / Cancha</p>
                    <p className="font-bold text-gray-900">{actaSeleccionada.partido?.cancha || 'Cancha Oficial'}</p>
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

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck size={18} className="text-liga-azul" /> Novedades y Observaciones del Vocal
                </h4>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed min-h-[70px]">
                  {actaSeleccionada.observaciones || 'Sin novedades registradas durante el partido.'}
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <button
                  onClick={() => descargarPDF(actaSeleccionada)}
                  className="px-5 py-2 bg-liga-verde text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2"
                >
                  <FileText size={16} /> Descargar PDF Oficial
                </button>
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