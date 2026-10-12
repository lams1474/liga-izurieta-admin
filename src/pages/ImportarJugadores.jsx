import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

// Mapeo de nombres de hojas a disciplina/categoría
const HOJAS_PERMITIDAS = {
  FUTBOL_HOMBRES:     { disciplina: 'futbol',   categoria: 'hombres' },
  FUTBOL_MUJERES:     { disciplina: 'futbol',   categoria: 'mujeres' },
  FUTBOL_SUB12:       { disciplina: 'futbol',   categoria: 'sub12' },
  FUTBOL_MASTER40:    { disciplina: 'futbol',   categoria: 'master40' },
  FUTSALA_HOMBRES:    { disciplina: 'futsala',  categoria: 'hombres' },
  FUTSALA_MUJERES:    { disciplina: 'futsala',  categoria: 'mujeres' },
  FUTSALA_SUB12:      { disciplina: 'futsala',  categoria: 'sub12' },
  FUTSALA_MASTER40:   { disciplina: 'futsala',  categoria: 'master40' },
  ECUAVOLY_HOMBRES:   { disciplina: 'ecuavoly', categoria: 'hombres' },
  ECUAVOLY_MUJERES:   { disciplina: 'ecuavoly', categoria: 'mujeres' },
  ECUAVOLY_SUB12:     { disciplina: 'ecuavoly', categoria: 'sub12' },
  ECUAVOLY_MASTER40:  { disciplina: 'ecuavoly', categoria: 'master40' },
}

export default function ImportarJugadores() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [equipos, setEquipos] = useState([])
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 })

  // Cargar equipos
  useEffect(() => {
    async function cargarEquipos() {
      const { data } = await supabase
        .from('equipos')
        .select('id, nombre, disciplina, categoria')
        .eq('activo', true)
        .order('nombre')
      setEquipos(data || [])
    }
    cargarEquipos()
  }, [])

  // Seleccionar archivo
  function handleArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo se aceptan archivos .xlsx o .xls')
      return
    }

    setArchivo(file)
    setResultado(null)
  }

  // Analizar el archivo
  async function analizar() {
    if (!equipoSeleccionado) {
      toast.error('Selecciona el equipo primero')
      return
    }
    if (!archivo) {
      toast.error('Selecciona un archivo')
      return
    }

    setAnalizando(true)

    try {
      const data = await archivo.arrayBuffer()
      const workbook = XLSX.read(data, { cellDates: true })

      const equipoActual = equipos.find((e) => e.id === equipoSeleccionado)

      const resultadoGlobal = {
        equipo: equipoActual,
        hojas: [],
        totalValidos: 0,
        totalErrores: 0,
        totalAdvertencias: 0,
        registros: [],
      }

      // Recorrer cada hoja del Excel
      for (const nombreHoja of workbook.SheetNames) {
        const config = HOJAS_PERMITIDAS[nombreHoja.toUpperCase()]
        if (!config) continue // Ignorar hojas no permitidas (ej: INSTRUCCIONES)

        // Verificar que la hoja corresponde al equipo seleccionado
        if (config.disciplina !== equipoActual.disciplina || config.categoria !== equipoActual.categoria) {
          continue // Ignorar hojas que no son de este equipo
        }

        const hoja = workbook.Sheets[nombreHoja]
        const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' })

        const hojaResultado = {
          nombre: nombreHoja,
          disciplina: config.disciplina,
          categoria: config.categoria,
          validos: [],
          errores: [],
          advertencias: [],
        }

        // Procesar cada fila
        for (let i = 0; i < filas.length; i++) {
          const fila = filas[i]
          const numeroFila = i + 2 // +2 porque la fila 1 es el encabezado

          // Leer los campos del Excel
          const nombresCompletos = (fila['Apellidos y Nombres'] || '').toString().trim()
          const cedula = (fila['Cédula'] || '').toString().replace(/\D/g, '').trim()
          const fechaNacimiento = fila['Fecha de Nacimiento']
          const dorsal = fila['Dorsal'] || null
          const posicion = (fila['Posición'] || '').toString().trim()
          const tipoPase = (fila['Tipo de Pase'] || 'nuevo').toString().trim().toLowerCase()
          const clubAnterior = (fila['Club Anterior'] || '').toString().trim()
          const tutorNombre = (fila['Nombre del Tutor'] || '').toString().trim()
          const tutorCedula = (fila['Cédula del Tutor'] || '').toString().replace(/\D/g, '').trim()
          const tutorTelefono = (fila['Teléfono del Tutor'] || '').toString().replace(/\D/g, '').trim()
          const observaciones = (fila['Observaciones'] || '').toString().trim()

          // Validar
          const erroresFila = []

          if (!nombresCompletos) erroresFila.push('Falta el nombre')
          if (!cedula) erroresFila.push('Falta la cédula')
          else if (cedula.length !== 10) erroresFila.push(`Cédula inválida (${cedula.length} dígitos)`)

          if (!fechaNacimiento) {
            erroresFila.push('Falta fecha de nacimiento')
          } else {
            // Normalizar fecha
            let fechaISO = null
            if (fechaNacimiento instanceof Date) {
              fechaISO = fechaNacimiento.toISOString().split('T')[0]
            } else {
              const fechaDate = new Date(fechaNacimiento)
              if (isNaN(fechaDate.getTime())) {
                erroresFila.push('Fecha inválida')
              } else {
                fechaISO = fechaDate.toISOString().split('T')[0]
              }
            }
            if (fechaISO) fila._fechaISO = fechaISO
          }

          // Calcular si es menor
          let esMenor = false
          if (fila._fechaISO) {
            const hoy = new Date()
            const nac = new Date(fila._fechaISO)
            let edad = hoy.getFullYear() - nac.getFullYear()
            const mes = hoy.getMonth() - nac.getMonth()
            if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
            esMenor = edad < 18
          }

          // Validar tutor si es menor
          if (esMenor) {
            if (!tutorNombre) erroresFila.push('Falta nombre del tutor (menor)')
            if (!tutorCedula) erroresFila.push('Falta cédula del tutor (menor)')
            else if (tutorCedula.length !== 10) erroresFila.push('Cédula del tutor inválida')
            if (!tutorTelefono) erroresFila.push('Falta teléfono del tutor (menor)')
          }

          // Validar tipo de pase
          const tiposValidos = ['nuevo', 'club_club', 'liga_liga', 'canton', 'provincia']
          if (!tiposValidos.includes(tipoPase)) {
            erroresFila.push(`Tipo de pase inválido: "${tipoPase}"`)
          }
          if (tipoPase !== 'nuevo' && !clubAnterior) {
            erroresFila.push('Falta club anterior (pase ≠ nuevo)')
          }

          if (erroresFila.length > 0) {
            hojaResultado.errores.push({
              fila: numeroFila,
              nombres: nombresCompletos || '(sin nombre)',
              cedula: cedula || '(sin cédula)',
              errores: erroresFila,
            })
            continue
          }

          // Extraer nombres y apellidos
          // Formato esperado: "APELLIDOS NOMBRES"
          const partes = nombresCompletos.split(/\s+/)
          let apellidos = ''
          let nombres = ''

          if (partes.length >= 4) {
            // Asumimos 2 apellidos + 2 nombres mínimo
            apellidos = partes.slice(0, 2).join(' ')
            nombres = partes.slice(2).join(' ')
          } else if (partes.length === 3) {
            apellidos = partes.slice(0, 2).join(' ')
            nombres = partes[2]
          } else if (partes.length === 2) {
            apellidos = partes[0]
            nombres = partes[1]
          } else {
            apellidos = nombresCompletos
            nombres = ''
          }

          // Agregar al listado de válidos
          hojaResultado.validos.push({
            fila: numeroFila,
            apellidos,
            nombres,
            nombreCompleto: nombresCompletos,
            cedula,
            fecha_nacimiento: fila._fechaISO,
            dorsal: dorsal ? parseInt(dorsal) : null,
            posicion: posicion || null,
            tipo_pase: tipoPase,
            club_anterior: clubAnterior || null,
            es_menor: esMenor,
            tutor_nombre: tutorNombre || null,
            tutor_cedula: tutorCedula || null,
            tutor_telefono: tutorTelefono || null,
            observaciones: observaciones || null,
            disciplina: config.disciplina,
            categoria: config.categoria,
          })
        }

        if (hojaResultado.validos.length > 0 || hojaResultado.errores.length > 0) {
          resultadoGlobal.hojas.push(hojaResultado)
          resultadoGlobal.totalValidos += hojaResultado.validos.length
          resultadoGlobal.totalErrores += hojaResultado.errores.length
        }
      }

      // Verificar duplicados contra la BD
      if (resultadoGlobal.totalValidos > 0) {
        const cedulas = resultadoGlobal.registros.length > 0 
          ? resultadoGlobal.registros.map(r => r.cedula)
          : resultadoGlobal.hojas.flatMap(h => h.validos.map(v => v.cedula))

        const { data: existentes } = await supabase
          .from('jugadores')
          .select('cedula, apellidos, nombres')
          .in('cedula', cedulas)

        if (existentes && existentes.length > 0) {
          const cedulasExistentes = new Set(existentes.map(e => e.cedula))
          resultadoGlobal.totalAdvertencias = 0

          // Mover de válidos a advertencias
          resultadoGlobal.hojas.forEach(hoja => {
            hoja.validos = hoja.validos.filter(v => {
              if (cedulasExistentes.has(v.cedula)) {
                hoja.advertencias.push({
                  ...v,
                  motivo: 'Ya existe en el sistema',
                })
                resultadoGlobal.totalAdvertencias++
                resultadoGlobal.totalValidos--
                return false
              }
              return true
            })
          })
        }
      }

      setResultado(resultadoGlobal)
      toast.success(`Análisis completo: ${resultadoGlobal.totalValidos} válidos`)
    } catch (err) {
      console.error(err)
      toast.error('Error al analizar el archivo: ' + err.message)
    } finally {
      setAnalizando(false)
    }
  }

  // Importar
  async function importar() {
    if (!resultado || resultado.totalValidos === 0) return

    setImportando(true)
    const todos = resultado.hojas.flatMap(h => h.validos)
    setProgreso({ actual: 0, total: todos.length })

    let importados = 0
    let fallidos = 0

    for (let i = 0; i < todos.length; i++) {
      const j = todos[i]
      setProgreso({ actual: i + 1, total: todos.length })

      try {
        // 1. Insertar jugador
        const { data: nuevoJugador, error: errJug } = await supabase
          .from('jugadores')
          .insert({
            nombres: j.nombres.toUpperCase(),
            apellidos: j.apellidos.toUpperCase(),
            cedula: j.cedula,
            fecha_nacimiento: j.fecha_nacimiento,
            tipo_pase: j.tipo_pase,
            club_anterior: j.club_anterior,
            estado_pase: 'pendiente',
            calificado: false,
            consentimiento_firmado: false,
            foto_actualizada: false,
            tutor_nombre: j.tutor_nombre,
            tutor_cedula: j.tutor_cedula,
            tutor_telefono: j.tutor_telefono,
          })
          .select()
          .single()

        if (errJug) throw errJug

        // 2. Inscribir en el equipo (que corresponde a esta hoja)
        // Pero primero verificar que el equipo actual coincida
        // El equipo seleccionado es uno, pero cada hoja tiene su disciplina/categoría
        // Buscar el equipo correspondiente a esta disciplina+categoría del club
        const { data: equipoHoja } = await supabase
          .from('equipos')
          .select('id')
          .eq('nombre', resultado.equipo.nombre)
          .eq('disciplina', j.disciplina)
          .eq('categoria', j.categoria)
          .single()

        const equipoFinal = equipoHoja?.id || equipoSeleccionado

        const { error: errInsc } = await supabase
          .from('jugador_equipo')
          .insert({
            jugador_id: nuevoJugador.id,
            equipo_id: equipoFinal,
            dorsal: j.dorsal,
            posicion: j.posicion,
            activo: true,
          })

        if (errInsc) throw errInsc

        // 3. Historial
        await supabase.from('historial_clubes_jugador').insert({
          jugador_id: nuevoJugador.id,
          equipo_id: equipoFinal,
          disciplina: j.disciplina,
          categoria: j.categoria,
          temporada: '2026-2027',
          fecha_desde: new Date().toISOString().split('T')[0],
          tipo_movimiento: j.tipo_pase === 'nuevo' ? 'nuevo' : 'pase_entrada',
          registrado_por: usuario.id,
        })

        importados++
      } catch (err) {
        console.error('Error importando:', j, err)
        fallidos++
      }
    }

    setImportando(false)
    toast.success(`Importación completa: ${importados} importados, ${fallidos} fallidos`)

    // Redirigir a la lista de jugadores
    setTimeout(() => navigate('/jugadores'), 2000)
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/jugadores')}
          className="p-2 hover:bg-gray-200 rounded-md transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-liga-azul">Importar Jugadores</h1>
          <p className="text-gray-500 text-sm">Carga masiva desde archivo Excel</p>
        </div>
      </div>

      {/* Paso 1: Equipo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-liga-azul text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            1
          </span>
          <h3 className="font-bold text-gray-800">Selecciona el equipo</h3>
        </div>

        <select
          value={equipoSeleccionado}
          onChange={(e) => {
            setEquipoSeleccionado(e.target.value)
            setResultado(null)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
        >
          <option value="">Seleccionar equipo...</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nombre} ({eq.disciplina} · {eq.categoria})
            </option>
          ))}
        </select>
      </div>

      {/* Paso 2: Archivo */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-liga-azul text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
            2
          </span>
          <h3 className="font-bold text-gray-800">Selecciona el archivo Excel</h3>
        </div>

        <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-liga-azul hover:bg-blue-50/30 transition-colors block">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleArchivo}
            className="hidden"
          />
          <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3" />
          {archivo ? (
            <>
              <p className="font-semibold text-liga-azul">{archivo.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(archivo.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-700">
                Haz clic para seleccionar el archivo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceptados: .xlsx, .xls
              </p>
            </>
          )}
        </label>
      </div>

      {/* Botón analizar */}
      {archivo && !resultado && (
        <div className="mb-6">
          <button
            onClick={analizar}
            disabled={analizando || !equipoSeleccionado}
            className="w-full bg-liga-azul text-white px-6 py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {analizando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analizando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Analizar archivo
              </>
            )}
          </button>
        </div>
      )}

      {/* Paso 3: Resultado */}
      {resultado && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-liga-azul text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </span>
              <h3 className="font-bold text-gray-800">Resumen del análisis</h3>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={18} />
                  <span className="font-semibold">Válidos</span>
                </div>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {resultado.totalValidos}
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle size={18} />
                  <span className="font-semibold">Advertencias</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700 mt-1">
                  {resultado.totalAdvertencias}
                </p>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle size={18} />
                  <span className="font-semibold">Errores</span>
                </div>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {resultado.totalErrores}
                </p>
              </div>
            </div>

            {/* Detalle por hoja */}
            <div className="space-y-3">
              {resultado.hojas.map((hoja) => (
                <div key={hoja.nombre} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-700">
                      {hoja.nombre}
                    </span>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {hoja.validos.length} ✓
                      </span>
                      {hoja.advertencias.length > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          {hoja.advertencias.length} ⚠
                        </span>
                      )}
                      {hoja.errores.length > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {hoja.errores.length} ✗
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Errores detallados */}
                  {hoja.errores.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-600 font-semibold">
                        Ver errores
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {hoja.errores.map((err, i) => (
                          <div key={i} className="bg-red-50 p-2 rounded">
                            <p className="font-semibold text-red-800">
                              Fila {err.fila}: {err.nombres}
                            </p>
                            <ul className="list-disc list-inside text-red-700 ml-2">
                              {err.errores.map((e, j) => (
                                <li key={j}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Advertencias detalladas */}
                  {hoja.advertencias.length > 0 && (
                    <details className="text-xs mt-2">
                      <summary className="cursor-pointer text-yellow-600 font-semibold">
                        Ver advertencias
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {hoja.advertencias.map((adv, i) => (
                          <div key={i} className="bg-yellow-50 p-2 rounded">
                            <p className="font-semibold text-yellow-800">
                              {adv.nombreCompleto} ({adv.cedula})
                            </p>
                            <p className="text-yellow-700">{adv.motivo}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          {!importando ? (
            <div className="flex gap-3">
              <button
                onClick={() => setResultado(null)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={importar}
                disabled={resultado.totalValidos === 0}
                className="flex-1 bg-liga-azul text-white px-4 py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload size={18} />
                Importar {resultado.totalValidos} jugadores
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-3">Importando...</h3>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-liga-azul h-3 rounded-full transition-all"
                  style={{
                    width: `${(progreso.actual / progreso.total) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {progreso.actual} de {progreso.total} jugadores
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}