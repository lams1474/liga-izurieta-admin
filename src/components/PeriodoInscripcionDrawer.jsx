import { useState, useEffect } from 'react'
import { X, Save, Calendar, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function PeriodoInscripcionDrawer({
  abierto,
  onCerrar,
  periodoActual,
  onGuardado,
}) {
  const { usuario } = useAuth()
  const esEdicion = !!periodoActual

  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    duracion_dias: 8,
  })
  const [errores, setErrores] = useState({})

  // Calcular fecha de fin
  const fechaFin = (() => {
    if (!form.duracion_dias || form.duracion_dias < 1) return null
    const fecha = new Date()
    fecha.setDate(fecha.getDate() + parseInt(form.duracion_dias))
    return fecha
  })()

  // Cargar datos si es edición
  useEffect(() => {
    if (!abierto) return

    if (periodoActual) {
      setForm({
        nombre: periodoActual.nombre || 'Período de Inscripción 2026-2027',
        duracion_dias: periodoActual.duracion_dias || 8,
      })
    } else {
      setForm({
        nombre: 'Período de Inscripción 2026-2027',
        duracion_dias: 8,
      })
    }
    setErrores({})
  }, [periodoActual, abierto])

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = 'Obligatorio'
    if (!form.duracion_dias || form.duracion_dias < 1) {
      nuevosErrores.duracion_dias = 'Mínimo 1 día'
    }
    if (form.duracion_dias > 90) {
      nuevosErrores.duracion_dias = 'Máximo 90 días'
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function guardar() {
    if (!validar()) {
      toast.error('Revisa los campos marcados')
      return
    }

    setCargando(true)

    try {
      const fechaInicio = new Date()
      const fechaFinDate = new Date()
      fechaFinDate.setDate(fechaFinDate.getDate() + parseInt(form.duracion_dias))

      if (esEdicion) {
        // ACTUALIZAR período existente
        const { error } = await supabase
          .from('periodos_inscripcion')
          .update({
            nombre: form.nombre.trim(),
            duracion_dias: parseInt(form.duracion_dias),
            fecha_fin: fechaFinDate.toISOString(),
          })
          .eq('id', periodoActual.id)

        if (error) throw error
        toast.success('Período actualizado')
      } else {
        // CREAR nuevo período
        // Primero desactivar cualquier otro activo
        await supabase
          .from('periodos_inscripcion')
          .update({ activo: false })
          .eq('activo', true)

        // Crear el nuevo
        const { error } = await supabase
          .from('periodos_inscripcion')
          .insert({
            nombre: form.nombre.trim(),
            fecha_inicio: fechaInicio.toISOString(),
            fecha_fin: fechaFinDate.toISOString(),
            duracion_dias: parseInt(form.duracion_dias),
            activo: true,
            creado_por: usuario.id,
          })

        if (error) throw error
        toast.success(`Período activado por ${form.duracion_dias} días`)
      }

      onGuardado?.()
      onCerrar?.()
    } catch (err) {
      console.error(err)
      toast.error('Error: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  async function cerrarPeriodo() {
    if (!periodoActual) return
    if (!confirm('¿Cerrar el período de inscripción antes de tiempo?')) return

    setCargando(true)
    try {
      const { error } = await supabase
        .from('periodos_inscripcion')
        .update({ activo: false })
        .eq('id', periodoActual.id)

      if (error) throw error
      toast.success('Período cerrado')
      onGuardado?.()
      onCerrar?.()
    } catch (err) {
      console.error(err)
      toast.error('Error: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Fondo oscuro */}
      <div
        onClick={onCerrar}
        className="fixed inset-0 bg-black/40 z-40"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              {esEdicion ? 'Editar Período' : 'Activar Período de Inscripción'}
            </h2>
            <p className="text-xs text-liga-amarillo">
              {esEdicion
                ? 'Ajusta la duración del período'
                : 'Los presidentes podrán inscribir jugadores'}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Info */}
          {!esEdicion && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  Al activar el período, los <strong>presidentes de club</strong> podrán
                  inscribir nuevos jugadores y editar los datos de sus jugadores actuales.
                  Al terminar el período, se bloqueará automáticamente.
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: Datos del período */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Configuración
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre del período <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Período de Inscripción 2026-2027"
                />
                {errores.nombre && (
                  <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Duración (días) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={form.duracion_dias}
                  onChange={(e) => actualizarCampo('duracion_dias', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.duracion_dias ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errores.duracion_dias && (
                  <p className="text-xs text-red-500 mt-1">{errores.duracion_dias}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {[3, 5, 8, 15].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => actualizarCampo('duracion_dias', d)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        parseInt(form.duracion_dias) === d
                          ? 'bg-liga-azul text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {d} días
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Resumen */}
          {fechaFin && (
            <section>
              <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
                Resumen
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded">
                  <Calendar size={18} className="text-liga-azul mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Fecha de inicio</p>
                    <p className="font-semibold text-sm">
                      {formatearFecha(new Date())}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded">
                  <Clock size={18} className="text-liga-rojo mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Fecha de fin</p>
                    <p className="font-semibold text-sm">{formatearFecha(fechaFin)}</p>
                  </div>
                </div>

                <div className="bg-liga-amarillo/20 border-l-4 border-liga-amarillo p-3 rounded">
                  <p className="text-xs text-yellow-900">
                    ⏱️ El período durará <strong>{form.duracion_dias} días</strong> desde
                    hoy. Al finalizar, los presidentes no podrán inscribir más jugadores.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          {esEdicion && (
            <button
              onClick={cerrarPeriodo}
              disabled={cargando}
              className="px-4 py-2 bg-liga-rojo text-white rounded-md font-semibold hover:bg-liga-rojo/90 transition-colors text-sm"
            >
              Cerrar ahora
            </button>
          )}
          <button
            onClick={onCerrar}
            disabled={cargando}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={cargando}
            className="flex-1 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                {esEdicion ? 'Guardar cambios' : 'Activar período'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}