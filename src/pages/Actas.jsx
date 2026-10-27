import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FileText, ArrowLeft, Users, CheckCircle, AlertTriangle, Lock, Target, StopCircle, PenTool, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Actas() {
  const { usuario } = useAuth()
  
  const [pestana, setPestana] = useState('pendientes')
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null)
  
  const [vista, setVista] = useState('lista')
  const [reglas, setReglas] = useState({ min_jugadores: 7, max_acta: 19 }) // Valores por defecto para Fútbol
  const [jugadoresLocal, setJugadoresLocal] = useState([])
  const [jugadoresVisitante, setJugadoresVisitante] = useState([])
  const [planilla, setPlanilla] = useState({})
  
  const [marcador, setMarcador] = useState({ local: 0, visitante: 0 })
  const [eventos, setEventos] = useState([]) 
  const [firmas, setFirmas] = useState([]) 
  const [modalAccion, setModalAccion] = useState(null) 
  const [novedades, setNovedades] = useState('')
  const [guardando, setGuardando] = useState(false)
  
  const esCapitan = usuario?.rol === 'capitan'

  useEffect(() => {
    async function cargarPartidos() {
      let query = supabase.from('partidos').select(`
        id, hora, cancha, fecha_id, jugado, goles_local, goles_visitante,
        local:equipos!partidos_equipo_local_id_fkey (id, nombre, disciplina, categoria),
        visitante:equipos!partidos_equipo_visitante_id_fkey (id, nombre, disciplina),
        fecha:fechas (numero, etapa:etapas(nombre)),
        arbitro:arbitros (nombres, apellidos),
        acta:actas (id, estado, observaciones)
      `)

      if (pestana === 'pendientes' && !esCapitan) {
        query = query.eq('jugado', false)
      } else {
        query = query.eq('jugado', true)
      }

      const { data, error } = await query.order('creado_en', { ascending: false })
      if (error) toast.error('Error al cargar partidos')
      else setPartidos(data || [])
      
      setCargando(false)
    }
    cargarPartidos()
  }, [vista, esCapitan, pestana])

  async function seleccionarPartido(partido) {
    setPartidoSeleccionado(partido)
    setPlanilla({})
    setNovedades(partido.acta?.[0]?.observaciones || '')
    setCargando(true)

    try {
      // Determinar si es fútbol o futsal para las reglas
      const esFutbol = partido.local.disciplina === 'futbol'
      const reglasPorDefecto = esFutbol 
        ? { min_jugadores: 7, max_acta: 19 } 
        : { min_jugadores: 4, max_acta: 12 }

      const { data: rule } = await supabase.from('reglas_disciplina').select('min_jugadores, max_acta').eq('disciplina', partido.local.disciplina).eq('categoria', partido.local.categoria).single()
      setReglas(rule || reglasPorDefecto)

      const cargarJugadores = async (equipoId) => {
        const { data: inscripciones } = await supabase.from('jugador_equipo').select(`dorsal, jugador:jugadores!jugador_equipo_jugador_id_fkey (id, apellidos, nombres, codigo_interno)`).eq('equipo_id', equipoId).eq('activo', true)
        const promesas = (inscripciones || []).filter(i => i.jugador).map(async (i) => {
          const { data: val } = await supabase.rpc('validar_carnet', { p_jugador_id: i.jugador.id, p_equipo_id: equipoId })
          return { id: i.jugador.id, apellidos: i.jugador.apellidos, nombres: i.jugador.nombres, codigo_interno: i.jugador.codigo_interno, dorsal: i.dorsal, estado_carnet: val?.[0]?.estado || 'HABILITADO', motivos_bloqueo: val?.[0]?.motivos || [] }
        })
        return (await Promise.all(promesas)).sort((a, b) => a.apellidos.localeCompare(b.apellidos))
      }

      setJugadoresLocal(await cargarJugadores(partido.local.id))
      setJugadoresVisitante(await cargarJugadores(partido.visitante.id))

      const { data: planillaExistente } = await supabase.from('planilla_partido').select('*').eq('partido_id', partido.id)
      if (planillaExistente && planillaExistente.length > 0) {
        const planillaCargada = {}
        planillaExistente.forEach(p => { planillaCargada[p.jugador_id] = p.es_titular ? 'titular' : 'suplente' })
        setPlanilla(planillaCargada)
      }

      const { data: goles } = await supabase.from('goles').select('*, jugador:jugadores(id, apellidos, nombres)').eq('partido_id', partido.id)
      const { data: tarjetas } = await supabase.from('sanciones_jugador').select('*, jugador:jugadores(id, apellidos, nombres), equipo:equipos(id)').eq('partido_id', partido.id)
      
      let evs = []
      if (goles) goles.forEach(g => evs.push({ tipo: 'gol', jugador_id: g.jugador.id, jugador: `${g.jugador.apellidos} ${g.jugador.nombres}`, equipo_id: null }))
      if (tarjetas) tarjetas.forEach(t => evs.push({ tipo: t.tipo, jugador_id: t.jugador.id, jugador: `${t.jugador.apellidos} ${t.jugador.nombres}`, equipo_id: t.equipo.id, motivo: t.motivo }))
      setEventos(evs)
      setMarcador({ local: partido.goles_local || 0, visitante: partido.goles_visitante || 0 })

      if (partido.acta && partido.acta.length > 0) {
        const { data: firmasData } = await supabase.from('firmas_acta').select('*').eq('acta_id', partido.acta[0].id)
        setFirmas(firmasData || [])
      } else {
        setFirmas([])
      }

      if (pestana === 'historial') setVista('ver_acta')
      else if (esCapitan) setVista('firmar_acta')
      else setVista('planilla')

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  // ============ GENERAR PDF OFICIAL ============
  function descargarPDF() {
    try {
      const doc = new jsPDF()
      const p = partidoSeleccionado
      
      const cleanText = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      }

      const dibujarEncabezado = (pagina) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text('LIGA DEPORTIVA BARRIAL JOSE I. IZURIETA', 105, 15, { align: 'center' })
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.text('PUJILI - ECUADOR', 105, 20, { align: 'center' })
        doc.text('FUNDADA EL 09 DE MARZO DEL 2013', 20, 26)
        doc.text('ACUERDO MUNICIPAL NO. 034-GADMP-2013', 130, 26)
        doc.line(15, 28, 195, 28)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.text(`ACTA DE JUEGO - PAGINA ${pagina}`, 105, 35, { align: 'center' })
      }

      dibujarEncabezado(1)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      
      const fechaStr = new Date().toLocaleDateString()
      doc.text(`VOCAL DE TURNO: ____________________`, 15, 45)
      doc.text(`CIUDAD: Pujili`, 100, 45)
      doc.text(`FECHA: ${fechaStr}`, 145, 45)
      doc.text(`HORA: ${p.hora?.slice(0,5) || '________'}`, 15, 51)

      doc.setFont("helvetica", "bold")
      doc.text(`CLUB: ${cleanText(p.local?.nombre?.toUpperCase())}`, 15, 60)
      doc.text(`CATEGORIA: ${cleanText(p.local?.categoria?.toUpperCase())}`, 100, 60)

      const filasLocal = jugadoresLocal.filter(j => planilla[j.id]).map(j => {
        const goles = eventos.filter(e => e.tipo === 'gol' && e.jugador_id === j.id).length
        const amarillas = eventos.filter(e => e.tipo === 'amarilla' && e.jugador_id === j.id).length
        const rojas = eventos.filter(e => e.tipo === 'roja' && e.jugador_id === j.id).length
        return [j.dorsal || '-', cleanText(`${j.apellidos} ${j.nombres}`), goles > 0 ? goles.toString() : '', amarillas > 0 ? 'X' : '', rojas > 0 ? 'X' : '']
      })

      autoTable(doc, {
        startY: 63,
        head: [['NO.', 'NOMBRES DE JUGADORES', 'GOL', 'T.A.', 'T.R.']],
        body: filasLocal,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 110 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 15, halign: 'center' }, 4: { cellWidth: 15, halign: 'center' } }
      })

      let finalY = doc.lastAutoTable.finalY + 10
      doc.setFont("helvetica", "bold")
      doc.text(`CLUB: ${cleanText(p.visitante?.nombre?.toUpperCase())}`, 15, finalY)
      doc.text(`CATEGORIA: ${cleanText(p.visitante?.categoria?.toUpperCase())}`, 100, finalY)

      const filasVisitante = jugadoresVisitante.filter(j => planilla[j.id]).map(j => {
        const goles = eventos.filter(e => e.tipo === 'gol' && e.jugador_id === j.id).length
        const amarillas = eventos.filter(e => e.tipo === 'amarilla' && e.jugador_id === j.id).length
        const rojas = eventos.filter(e => e.tipo === 'roja' && e.jugador_id === j.id).length
        return [j.dorsal || '-', cleanText(`${j.apellidos} ${j.nombres}`), goles > 0 ? goles.toString() : '', amarillas > 0 ? 'X' : '', rojas > 0 ? 'X' : '']
      })

      autoTable(doc, {
        startY: finalY + 3,
        head: [['NO.', 'NOMBRES DE JUGADORES', 'GOL', 'T.A.', 'T.R.']],
        body: filasVisitante,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 110 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 15, halign: 'center' }, 4: { cellWidth: 15, halign: 'center' } }
      })

      doc.addPage()
      dibujarEncabezado(2)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      
      const nombreArbitro = p.arbitro ? `${cleanText(p.arbitro.nombres)} ${cleanText(p.arbitro.apellidos)}` : '________________________'
      doc.text(`NOMBRE DEL SR. ARBITRO: ${nombreArbitro}`, 15, 45)

      const tarjetasLocal = eventos.filter(ev => (ev.tipo === 'amarilla' || ev.tipo === 'roja') && ev.equipo_id === p.local.id)
      const tarjetasVisitante = eventos.filter(ev => (ev.tipo === 'amarilla' || ev.tipo === 'roja') && ev.equipo_id === p.visitante.id)

      const dibujarSeccionTarjetas = (startY, nombreClub, tarjetas) => {
        doc.setFont("helvetica", "bold")
        doc.text(`TARJETAS DEL CLUB: ${cleanText(nombreClub.toUpperCase())}`, 15, startY)
        let yAmarillas = startY + 6
        let yRojas = startY + 45

        doc.text('TARJETAS AMARILLAS:', 15, yAmarillas)
        doc.setFont("helvetica", "normal")
        yAmarillas += 5
        const amarillas = tarjetas.filter(t => t.tipo === 'amarilla')
        for(let i=0; i<6; i++) {
          doc.text(`NO. ______`, 15, yAmarillas + (i*6))
          doc.line(35, yAmarillas + (i*6), 130, yAmarillas + (i*6))
          if (amarillas[i]) {
            doc.text(cleanText(amarillas[i].jugador), 37, yAmarillas + (i*6) - 1)
            doc.text(`POR: ${cleanText(amarillas[i].motivo || '______')}`, 135, yAmarillas + (i*6))
          } else {
            doc.text(`POR: ________________`, 135, yAmarillas + (i*6))
          }
        }

        doc.setFont("helvetica", "bold")
        doc.text('TARJETAS ROJAS:', 15, yRojas)
        doc.setFont("helvetica", "normal")
        yRojas += 5
        const rojas = tarjetas.filter(t => t.tipo === 'roja')
        for(let i=0; i<4; i++) {
          doc.text(`NO. ______`, 15, yRojas + (i*6))
          doc.line(35, yRojas + (i*6), 130, yRojas + (i*6))
          if (rojas[i]) {
            doc.text(cleanText(rojas[i].jugador), 37, yRojas + (i*6) - 1)
            doc.text(`POR: ${cleanText(rojas[i].motivo || '______')}`, 135, yRojas + (i*6))
          } else {
            doc.text(`POR: ________________`, 135, yRojas + (i*6))
          }
        }
        return yRojas + 30
      }

      let nextY = dibujarSeccionTarjetas(55, p.local?.nombre, tarjetasLocal)
      nextY = dibujarSeccionTarjetas(nextY, p.visitante?.nombre, tarjetasVisitante)

      // SECCIÓN NOVEDADES
      doc.setFont("helvetica", "bold")
      doc.text('NOVEDADES:', 15, nextY)
      doc.setFont("helvetica", "normal")
      const splitText = doc.splitTextToSize(cleanText(p.acta?.[0]?.observaciones || 'Sin novedades registradas.'), 175)
      doc.text(splitText, 15, nextY + 6)
      
      let lineY = nextY + 6 + (splitText.length * 5) + 10

      // FIRMAS EN UNA SOLA LÍNEA
      const firmaY = Math.min(lineY + 50, 240)
      
      const fArbitro = firmas.find(f => f.firmante_tipo === 'arbitro')
      const fCapLocal = firmas.find(f => f.firmante_tipo === 'capitan_local' || f.firmante_tipo === 'local')
      const fCapVisitante = firmas.find(f => f.firmante_tipo === 'capitan_visitante' || f.firmante_tipo === 'visitante')
      const fVocal = firmas.find(f => f.firmante_tipo === 'vocal')

      const drawImageSafely = (base64, x, y, w, h) => {
        try {
          if (!base64) return;
          const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
          doc.addImage(cleanB64, "png", x, y, w, h, undefined, 'FAST');
        } catch (e) {
          console.error("Error al dibujar firma en PDF", e);
        }
      };

      const xPositions = [15, 65, 115, 165];
      const firmantes = [
        { nombre: 'CAPITÁN LOCAL', firma: fCapLocal },
        { nombre: 'CAPITÁN VISITANTE', firma: fCapVisitante },
        { nombre: 'ÁRBITRO', firma: fArbitro },
        { nombre: 'VOCAL', firma: fVocal }
      ];

      firmantes.forEach((item, index) => {
        const x = xPositions[index];
        drawImageSafely(item.firma?.firma_digital, x, firmaY - 20, 30, 15)
        doc.line(x, firmaY, x + 30, firmaY)
        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.text(item.nombre, x + 15, firmaY + 4, { align: 'center' })
      })

      doc.setFontSize(8)
      doc.text('VIVE EL FUTBOL SIN DROGAS Y SIN ALCOHOL', 15, 285)
      doc.text('CAMPEONATO 2026', 170, 285)

      const nombreLocal = p.local?.nombre?.replace(/[^a-zA-Z0-9]/g, '') || 'Local';
      const nombreVisitante = p.visitante?.nombre?.replace(/[^a-zA-Z0-9]/g, '') || 'Visitante';
      
      doc.save(`Acta_${nombreLocal}_vs_${nombreVisitante}.pdf`)
      toast.success('PDF Oficial descargado')
    } catch (err) {
      console.error("Error general en PDF:", err)
      toast.error('Error al generar PDF')
    }
  }

  async function toggleJugador(jugadorId, esLocal) {
    const jugadoresEquipo = esLocal ? jugadoresLocal : jugadoresVisitante
    const jugador = jugadoresEquipo.find(j => j.id === jugadorId)
    if (jugador.estado_carnet === 'BLOQUEADO') return toast.error(`No habilitado: ${jugador.motivos_bloqueo.join(' | ')}`)
    
    setPlanilla(prev => {
      const actual = prev[jugadorId]
      if (actual) {
        if (actual === 'titular') return { ...prev, [jugadorId]: 'suplente' }
        const nuevo = { ...prev }
        delete nuevo[jugadorId]
        return nuevo
      }
      const seleccionadosEquipo = Object.keys(prev).filter(id => jugadoresEquipo.some(j => j.id === id)).length
      if (seleccionadosEquipo >= reglas.max_acta) return toast.error(`Máximo ${reglas.max_acta} jugadores.`), prev
      return { ...prev, [jugadorId]: 'titular' }
    })
  }

  async function guardarPlanilla(iniciarPartido = false) {
    if (!partidoSeleccionado) return
    const titularesLocal = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesVisitante = Object.entries(planilla).filter(([id, rol]) => rol === 'titular' && jugadoresVisitante.some(j => j.id === id)).length
    
    if ((titularesLocal < reglas.min_jugadores || titularesVisitante < reglas.min_jugadores) && iniciarPartido) {
      return toast.error(`No puedes iniciar el partido sin el mínimo de jugadores (${reglas.min_jugadores} por equipo). Si un equipo no se presentó, usa la opción de incomparecencia.`)
    }

    setGuardando(true)
    try {
      await supabase.from('planilla_partido').delete().eq('partido_id', partidoSeleccionado.id)
      const registros = Object.entries(planilla).map(([jugadorId, rol]) => {
        const esLocal = jugadoresLocal.some(j => j.id === jugadorId)
        return { partido_id: partidoSeleccionado.id, equipo_id: esLocal ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id, jugador_id: jugadorId, es_titular: rol === 'titular', dorsal: (esLocal ? jugadoresLocal : jugadoresVisitante).find(j => j.id === jugadorId)?.dorsal }
      })
      if (registros.length > 0) await supabase.from('planilla_partido').insert(registros)
      toast.success('Planilla guardada')
      if (iniciarPartido) setVista('partido')
      else setVista('lista')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function registrarAccion(jugadorId) {
    if (!modalAccion) return
    setGuardando(true)
    try {
      if (modalAccion.tipo === 'gol') {
        await supabase.from('goles').insert({ partido_id: partidoSeleccionado.id, jugador_id: jugadorId, minuto: 0, tipo: 'normal' })
        const nuevosGoles = modalAccion.equipo === 'local' ? marcador.local + 1 : marcador.visitante + 1
        setMarcador({ ...marcador, [modalAccion.equipo]: nuevosGoles })
        await supabase.from('partidos').update({ [modalAccion.equipo === 'local' ? 'goles_local' : 'goles_visitante']: nuevosGoles }).eq('id', partidoSeleccionado.id)
      } else {
        await supabase.from('sanciones_jugador').insert({ partido_id: partidoSeleccionado.id, jugador_id: jugadorId, equipo_id: modalAccion.equipo === 'local' ? partidoSeleccionado.local.id : partidoSeleccionado.visitante.id, tipo: modalAccion.tipoTarjeta, motivo: `Tarjeta ${modalAccion.tipoTarjeta}`, fechas_sancion: 0, activa: true, registrado_por: usuario.id })
      }
      toast.success('Registrado')
      setModalAccion(null)
      
      const { data: g } = await supabase.from('goles').select('*, jugador:jugadores(id, apellidos, nombres)').eq('partido_id', partidoSeleccionado.id)
      const { data: t } = await supabase.from('sanciones_jugador').select('*, jugador:jugadores(id, apellidos, nombres), equipo:equipos(id)').eq('partido_id', partidoSeleccionado.id)
      let evs = []
      if (g) g.forEach(x => evs.push({ tipo: 'gol', jugador_id: x.jugador.id, jugador: `${x.jugador.apellidos} ${x.jugador.nombres}`, equipo_id: null }))
      if (t) t.forEach(x => evs.push({ tipo: x.tipo, jugador_id: x.jugador.id, jugador: `${x.jugador.apellidos} ${x.jugador.nombres}`, equipo_id: x.equipo.id, motivo: x.motivo }))
      setEventos(evs)
    } catch (err) {
      console.error(err)
    } finally {
      setGuardando(false)
    }
  }

  async function finalizarPartido() {
    if (!window.confirm('¿Finalizar el partido? Se enviará a los capitanes para su firma.')) return
    setGuardando(true)
    try {
      await supabase.from('partidos').update({ jugado: true }).eq('id', partidoSeleccionado.id)
      
      let actaId = partidoSeleccionado.acta?.[0]?.id
      if (!actaId) {
        const { data: nuevaActa } = await supabase.from('actas').insert({ partido_id: partidoSeleccionado.id, estado: 'firmando', observaciones: novedades }).select().single()
        actaId = nuevaActa.id
      } else {
        await supabase.from('actas').update({ observaciones: novedades }).eq('id', actaId)
      }

      await supabase.from('firmas_acta').insert({ acta_id: actaId, firmante_tipo: usuario.rol === 'arbitro' ? 'arbitro' : 'vocal', firmante_id: usuario.id })
      toast.success('Partido finalizado. Esperando firma de capitanes.')
      setVista('lista')
    } catch (err) {
      console.error(err)
      toast.error('Error al finalizar')
    } finally {
      setGuardando(false)
    }
  }

  async function firmarActa() {
    setGuardando(true)
    try {
      let actaId = partidoSeleccionado.acta?.[0]?.id
      if (!actaId) throw new Error('No se encontró el acta')
      const esLocal = usuario.club_id === partidoSeleccionado.local.id
      await supabase.from('firmas_acta').insert({ acta_id: actaId, firmante_tipo: esLocal ? 'capitan_local' : 'capitan_visitante', firmante_id: usuario.id })
      toast.success('Acta firmada. ¡Gracias, Capitán!')
      setVista('lista')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al firmar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando && vista === 'lista') return <div className="p-8 text-center">Cargando...</div>

  if (vista === 'lista') {
    return (
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

        {partidos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-2" />
            {pestana === 'pendientes' ? 'No hay partidos pendientes.' : 'No hay partidos finalizados.'}
          </div>
        ) : (
          <div className="space-y-3">
            {partidos.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => seleccionarPartido(p)}>
                <div className="flex-1 text-center sm:text-right font-bold text-gray-800">{p.local?.nombre}</div>
                <div className="px-6 text-center">
                  <div className="text-xs text-gray-400 font-semibold mb-1">{p.fecha?.etapa?.nombre} - Fecha {p.fecha?.numero}</div>
                  <div className="text-lg font-bold text-liga-azul">VS</div>
                  {p.jugado && <div className="text-sm font-bold text-green-600">{p.goles_local} - {p.goles_visitante}</div>}
                </div>
                <div className="flex-1 text-center sm:text-left font-bold text-gray-800">{p.visitante?.nombre}</div>
                <div className="mt-4 sm:mt-0 sm:ml-4">
                  <button className={`${pestana === 'historial' ? 'bg-gray-700' : esCapitan ? 'bg-liga-rojo' : 'bg-liga-azul'} text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2`}>
                    {pestana === 'historial' ? <FileText size={16} /> : esCapitan ? <PenTool size={16} /> : <Users size={16} />} 
                    {pestana === 'historial' ? 'Ver Acta' : esCapitan ? 'Firmar Acta' : 'Ingresar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (vista === 'ver_acta') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <button onClick={() => setVista('lista')} className="text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"><ArrowLeft size={18} /> Volver</button>
              <button onClick={descargarPDF} className="bg-red-600 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-red-700"><Download size={18} /> Descargar PDF Oficial</button>
            </div>

            <h2 className="text-2xl font-bold text-center text-liga-azul mb-2">Acta Oficial</h2>
            <p className="text-center text-gray-500 mb-6">{partidoSeleccionado.fecha?.etapa?.nombre} - Fecha {partidoSeleccionado.fecha?.numero}</p>

            <div className="bg-liga-azul text-white rounded-lg p-4 mb-6 flex justify-between items-center">
              <span className="font-bold text-lg">{partidoSeleccionado.local?.nombre}</span>
              <span className="text-3xl font-bold">{marcador.local} - {marcador.visitante}</span>
              <span className="font-bold text-lg">{partidoSeleccionado.visitante?.nombre}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Eventos del Partido</h3>
              {eventos.length === 0 ? <p className="text-sm text-gray-500">Sin eventos.</p> : (
                <ul className="space-y-2 text-sm">
                  {eventos.map((ev, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="font-semibold">{ev.jugador}</span>
                      <span className="capitalize">{ev.tipo === 'amarilla' ? '🟨 Amarilla' : ev.tipo === 'roja' ? '🟥 Roja' : '⚽ Gol'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
         </div>
      </div>
    )
  }

  if (vista === 'firmar_acta') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
         <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
            <h2 className="text-xl font-bold text-liga-azul mb-2">Acta del Partido</h2>
            <p className="text-gray-600 mb-4">{partidoSeleccionado.local?.nombre} {marcador.local} - {marcador.visitante} {partidoSeleccionado.visitante?.nombre}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-bold text-gray-700 mb-3">Eventos Registrados</h3>
              {eventos.length === 0 ? <p className="text-sm text-gray-500">Sin eventos.</p> : (
                <ul className="space-y-2 text-sm">
                  {eventos.map((ev, i) => (
                    <li key={i} className="flex gap-2"><span className="font-bold">{ev.jugador}:</span> <span className="capitalize">{ev.tipo === 'amarilla' ? '🟨 Amarilla' : ev.tipo === 'roja' ? '🟥 Roja' : '⚽ Gol'}</span></li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6 text-sm text-yellow-800">
              Al firmar, confirmas que estás de acuerdo con el marcador y los eventos registrados por el árbitro y vocal.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setVista('lista')} className="flex-1 py-2 border rounded font-semibold">Volver</button>
              <button onClick={firmarActa} disabled={guardando} className="flex-1 bg-green-600 text-white py-2 rounded font-semibold flex justify-center items-center gap-2">
                <PenTool size={18} /> Firmar Acta
              </button>
            </div>
         </div>
      </div>
    )
  }

  if (vista === 'planilla') {
    const titularesL = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresLocal.some(j => j.id === id)).length
    const titularesV = Object.entries(planilla).filter(([id, r]) => r === 'titular' && jugadoresVisitante.some(j => j.id === id)).length

    return (
      <div className="max-w-6xl mx-auto pb-20">
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between sticky top-0 z-10">
          <button onClick={() => setVista('lista')} className="text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"><ArrowLeft size={18} /> Volver</button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.local?.nombre} vs {partidoSeleccionado.visitante?.nombre}</h2>
            <p className="text-xs text-gray-500">Mínimo: {reglas.min_jugadores} titulares</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => guardarPlanilla(false)} disabled={guardando} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-300">Guardar</button>
            <button onClick={() => guardarPlanilla(true)} disabled={guardando} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 flex items-center gap-2">
              <Target size={18} /> Iniciar Partido
            </button>
          </div>
        </div>

        {(titularesL < reglas.min_jugadores || titularesV < reglas.min_jugadores) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded flex items-start gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <p className="text-sm text-red-700 font-semibold">Faltan titulares. No podrás iniciar el partido hasta cumplir el mínimo de {reglas.min_jugadores} jugadores por equipo.</p>
          </div>
        )}

        <div className="flex gap-4 justify-center mb-6 text-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div> Titular</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded"></div> Suplente</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-gray-300 rounded"></div> No convocado</div>
          <div className="flex items-center gap-2"><Lock size={16} className="text-red-500" /> Bloqueado</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[ { team: partidoSeleccionado.local, players: jugadoresLocal, tit: titularesL, isLocal: true },
             { team: partidoSeleccionado.visitante, players: jugadoresVisitante, tit: titularesV, isLocal: false } ].map((data, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className={`${data.isLocal ? 'bg-liga-azul' : 'bg-gray-700'} text-white p-3 flex justify-between px-4`}>
                <h3 className="font-bold">{data.team?.nombre}</h3>
                <span className={`text-sm font-bold ${data.tit < reglas.min_jugadores ? 'text-red-300' : 'text-green-300'}`}>{data.tit} / {reglas.min_jugadores}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {data.players.map(j => {
                  const estado = planilla[j.id]
                  const bloqueado = j.estado_carnet === 'BLOQUEADO'
                  return (
                    <div key={j.id} onClick={() => toggleJugador(j.id, data.isLocal)} className={`p-3 flex items-center justify-between cursor-pointer ${bloqueado ? 'bg-red-50 opacity-75 cursor-not-allowed' : estado === 'titular' ? 'bg-green-50' : estado === 'suplente' ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold">{j.dorsal || '-'}</div>
                        <div>
                          <p className="font-semibold text-sm">{j.apellidos} {j.nombres}</p>
                          {bloqueado ? <p className="text-xs text-red-600">🔒 {j.motivos_bloqueo.join(', ')}</p> : <p className="text-xs text-gray-500">{j.codigo_interno}</p>}
                        </div>
                      </div>
                      {bloqueado ? <Lock className="text-red-500" size={20} /> : estado === 'titular' ? <CheckCircle className="text-green-500" size={20} /> : estado === 'suplente' ? <CheckCircle className="text-yellow-500" size={20} /> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-liga-azul">Partido en Curso</h1>
          <p className="text-sm text-gray-500">{partidoSeleccionado.fecha?.etapa?.nombre} - Fecha {partidoSeleccionado.fecha?.numero}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.local?.nombre}</h2>
            <div className="text-6xl font-bold text-liga-azul my-2">{marcador.local}</div>
            <button onClick={() => setModalAccion({ tipo: 'gol', equipo: 'local' })} className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-bold text-sm hover:bg-green-200 w-full mb-2">⚽ Gol Local</button>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'local', tipoTarjeta: 'amarilla' })} className="w-8 h-10 bg-yellow-400 rounded shadow text-xs font-bold flex items-center justify-center">A</button>
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'local', tipoTarjeta: 'roja' })} className="w-8 h-10 bg-red-600 rounded shadow text-xs font-bold text-white flex items-center justify-center">R</button>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-400 px-4">-</div>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-gray-800">{partidoSeleccionado.visitante?.nombre}</h2>
            <div className="text-6xl font-bold text-liga-azul my-2">{marcador.visitante}</div>
            <button onClick={() => setModalAccion({ tipo: 'gol', equipo: 'visitante' })} className="bg-green-100 text-green-700 px-4 py-2 rounded-md font-bold text-sm hover:bg-green-200 w-full mb-2">⚽ Gol Visitante</button>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'visitante', tipoTarjeta: 'amarilla' })} className="w-8 h-10 bg-yellow-400 rounded shadow text-xs font-bold flex items-center justify-center">A</button>
              <button onClick={() => setModalAccion({ tipo: 'tarjeta', equipo: 'visitante', tipoTarjeta: 'roja' })} className="w-8 h-10 bg-red-600 rounded shadow text-xs font-bold text-white flex items-center justify-center">R</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Novedades del Partido (Opcional):</label>
        <textarea 
          value={novedades}
          onChange={(e) => setNovedades(e.target.value)}
          placeholder="Escribe aquí lesiones, incidentes, retrasos, etc."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-liga-azul focus:border-liga-azul"
          rows="3"
        />
      </div>

      <button onClick={finalizarPartido} disabled={guardando} className="w-full bg-liga-rojo text-white py-3 rounded-lg font-bold text-lg hover:bg-liga-rojo/90 flex items-center justify-center gap-2 mb-6 shadow-md">
        <StopCircle size={24} /> Finalizar Partido
      </button>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold text-gray-700 mb-3">Eventos del Partido</h3>
        {eventos.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">No hay eventos registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {eventos.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                <span className="font-bold">{ev.jugador}</span>
                <span className="text-gray-400">-</span>
                <span className="capitalize">{ev.tipo === 'amarilla' ? '🟨 Tarjeta Amarilla' : ev.tipo === 'roja' ? '🟥 Tarjeta Roja' : '⚽ Gol'}</span>
                {ev.motivo && <span className="text-gray-500 text-xs ml-auto">({ev.motivo})</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalAccion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {modalAccion.tipo === 'gol' ? '¿Quién hizo el Gol?' : `¿Quién recibió la ${modalAccion.tipoTarjeta === 'amarilla' ? 'Amarilla' : 'Roja'}?`}
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
              {(modalAccion.equipo === 'local' ? jugadoresLocal : jugadoresVisitante)
                .filter(j => planilla[j.id])
                .map(j => (
                <button key={j.id} onClick={() => registrarAccion(j.id)} className="w-full text-left p-2 border rounded hover:bg-gray-50 flex justify-between">
                  <span>{j.apellidos} {j.nombres}</span>
                  <span className="text-gray-400">#{j.dorsal}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setModalAccion(null)} className="w-full py-2 bg-gray-200 rounded font-semibold">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}