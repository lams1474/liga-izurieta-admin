/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function EquipoFormDrawer({ abierto, onCerrar, equipoEditar, onGuardado }) {
  const esEdicion = !!equipoEditar

  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    disciplina: 'futsala',
    categoria: 'hombres',
    activo: true,
  })

  const [errores, setErrores] = useState({})

  useEffect(() => {
    if (!abierto) return

    if (equipoEditar) {
      setForm({
        nombre: equipoEditar.nombre || '',
        disciplina: equipoEditar.disciplina || 'futsala',
        categoria: equipoEditar.categoria || 'hombres',
        activo: equipoEditar.activo ?? true,
      })
    } else {
      setForm({
        nombre: '',
        disciplina: 'futsala',
        categoria: 'hombres',
        activo: true,
      })
    }
    setErrores({})
  }, [equipoEditar, abierto])

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio'
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function guardar() {
    if (!validar()) {
      toast.error('Por favor revisa el nombre del equipo')
      return
    }

    setCargando(true)

    try {
      if (esEdicion) {
        const { error } = await supabase
          .from('equipos')
          .update({
            nombre: form.nombre.trim(),
            disciplina: form.disciplina,
            categoria: form.categoria,
            activo: form.activo,
            actualizado_en: new Date().toISOString(),
          })
          .eq('id', equipoEditar.id)

        if (error) throw error
        toast.success('Equipo actualizado con éxito')
      } else {
        const { error } = await supabase
          .from('equipos')
          .insert({
            nombre: form.nombre.trim(),
            disciplina: form.disciplina,
            categoria: form.categoria,
            activo: form.activo,
          })

        if (error) throw error
        toast.success('Equipo creado con éxito')
      }

      onGuardado?.()
      onCerrar?.()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar equipo: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

  return (
    <>
      <div onClick={onCerrar} className="fixed inset-0 bg-black/40 z-40" />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-liga-azul text-white px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">
              {esEdicion ? 'Editar Equipo' : 'Nuevo Equipo'}
            </h2>
            <p className="text-xs text-liga-amarillo">
              {esEdicion ? 'Modifica los datos del club' : 'Registra un nuevo club afiliado'}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre del Equipo / Club <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder="Ej. Club Spartanos FC"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                errores.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errores.nombre && (
              <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Disciplina
            </label>
            <select
              value={form.disciplina}
              onChange={(e) => actualizarCampo('disciplina', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            >
              <option value="futsala">Futsala</option>
              <option value="futbol">Fútbol</option>
              <option value="ecuavoly">Ecuavoly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={form.categoria}
              onChange={(e) => actualizarCampo('categoria', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            >
              <option value="hombres">Hombres (Senior)</option>
              <option value="mujeres">Mujeres</option>
              <option value="sub12">Sub-12</option>
              <option value="master40">Master 40</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={(e) => actualizarCampo('activo', e.target.checked)}
              className="w-4 h-4 text-liga-azul rounded focus:ring-liga-azul border-gray-300"
            />
            <label htmlFor="activo" className="text-sm font-semibold text-gray-700">
              Equipo Activo en Torneo
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
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
                {esEdicion ? 'Guardar Cambios' : 'Crear Equipo'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}