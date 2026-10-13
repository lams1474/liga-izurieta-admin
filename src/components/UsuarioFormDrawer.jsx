import { useState, useEffect } from 'react'
import { X, Save, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'admin', label: 'Administrador', emoji: '👑', requiereClub: false },
  { value: 'secretaria', label: 'Secretaría', emoji: '📋', requiereClub: false },
  { value: 'delegado', label: 'Presidente de Club', emoji: '🏛️', requiereClub: true },
  { value: 'vocal', label: 'Vocal', emoji: '📢', requiereClub: false },
  { value: 'arbitro', label: 'Árbitro', emoji: '🟥', requiereClub: false },
  { value: 'capitan', label: 'Capitán', emoji: '⚽', requiereClub: true },
]

// Genera una contraseña aleatoria segura
function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function UsuarioFormDrawer({ abierto, onCerrar, usuarioEditar, onGuardado }) {
  const esEdicion = !!usuarioEditar

  const [cargando, setCargando] = useState(false)
  const [equipos, setEquipos] = useState([])
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    rol: 'delegado',
    telefono: '',
    club_id: '',
  })

  const [errores, setErrores] = useState({})

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

  // Cargar datos si es edición o resetear si es nuevo
  useEffect(() => {
    if (!abierto) return

    if (usuarioEditar) {
       
    
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        nombres: usuarioEditar.nombres || '',
        apellidos: usuarioEditar.apellidos || '',
        email: usuarioEditar.email || '',
        password: '',
        rol: usuarioEditar.rol || 'delegado',
        telefono: usuarioEditar.telefono || '',
        club_id: usuarioEditar.club_id || '',
      })
    } else {
       
      setForm({
        nombres: '',
        apellidos: '',
        email: '',
        password: generarPassword(),
        rol: 'delegado',
        telefono: '',
        club_id: '',
      })
    }
    setErrores({})
    setMostrarPassword(false)
  }, [usuarioEditar, abierto])

  const rolActual = ROLES.find((r) => r.value === form.rol)
  const requiereClub = rolActual?.requiereClub || false

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  function validar() {
    const nuevosErrores = {}

    if (!form.nombres.trim()) nuevosErrores.nombres = 'Obligatorio'
    if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Obligatorio'

    if (!form.email.trim()) {
      nuevosErrores.email = 'Obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nuevosErrores.email = 'Email inválido'
    }

    if (!esEdicion) {
      if (!form.password) {
        nuevosErrores.password = 'Obligatorio'
      } else if (form.password.length < 8) {
        nuevosErrores.password = 'Mínimo 8 caracteres'
      }
    }

    if (!form.rol) nuevosErrores.rol = 'Obligatorio'

    if (requiereClub && !form.club_id) {
      nuevosErrores.club_id = 'Obligatorio para este rol'
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
      if (esEdicion) {
        // EDITAR usuario existente
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombres: form.nombres.toUpperCase().trim(),
            apellidos: form.apellidos.toUpperCase().trim(),
            email: form.email.toLowerCase().trim(),
            rol: form.rol,
            telefono: form.telefono.trim() || null,
            club_id: requiereClub ? form.club_id : null,
            actualizado_en: new Date().toISOString(),
          })
          .eq('id', usuarioEditar.id)

        if (error) throw error

        toast.success('Usuario actualizado')
        onGuardado?.()
        onCerrar?.()
      } else {
        // CREAR usuario nuevo → llamar a la Edge Function
        const { data, error } = await supabase.functions.invoke('crear-usuario', {
          body: {
            nombres: form.nombres.toUpperCase().trim(),
            apellidos: form.apellidos.toUpperCase().trim(),
            email: form.email.toLowerCase().trim(),
            password: form.password,
            rol: form.rol,
            telefono: form.telefono.trim() || null,
            club_id: requiereClub ? form.club_id : null,
          },
        })

        if (error) throw error

        if (data?.error) {
          throw new Error(data.error)
        }

        if (!data?.success) {
          throw new Error(data?.message || 'Error desconocido')
        }

        toast.success(`Usuario creado: ${data.email}`)
        toast.success(`Contraseña: ${form.password}`, { duration: 15000 })

        onGuardado?.()
        onCerrar?.()
      }
    } catch (err) {
      console.error(err)
      if (err.message?.includes('duplicate') || err.message?.includes('already')) {
        toast.error('Ya existe un usuario con ese email')
      } else {
        toast.error('Error: ' + err.message)
      }
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) return null

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
              {esEdicion ? 'Editar Usuario' : 'Agregar Usuario'}
            </h2>
            <p className="text-xs text-liga-amarillo">
              {esEdicion ? 'Modifica los datos' : 'Crea una cuenta de acceso'}
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
          {/* SECCIÓN: Datos personales */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Datos Personales
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombres}
                  onChange={(e) => actualizarCampo('nombres', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="JUAN MANUEL"
                />
                {errores.nombres && (
                  <p className="text-xs text-red-500 mt-1">{errores.nombres}</p>
                )}
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.apellidos}
                  onChange={(e) => actualizarCampo('apellidos', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.apellidos ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="PEREZ GOMEZ"
                />
                {errores.apellidos && (
                  <p className="text-xs text-red-500 mt-1">{errores.apellidos}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) =>
                    actualizarCampo('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
                  placeholder="0991234567"
                  maxLength={10}
                />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Cuenta de acceso */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Cuenta de Acceso
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="presidente.spartanos@liga.com"
                  disabled={esEdicion}
                />
                {errores.email && (
                  <p className="text-xs text-red-500 mt-1">{errores.email}</p>
                )}
                {esEdicion && (
                  <p className="text-xs text-gray-500 mt-1">
                    El email no se puede cambiar (identifica la cuenta)
                  </p>
                )}
              </div>

              {!esEdicion && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={mostrarPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => actualizarCampo('password', e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${
                          errores.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nueva = generarPassword()
                        actualizarCampo('password', nueva)
                        setMostrarPassword(true)
                      }}
                      className="px-3 py-2 bg-liga-amarillo text-liga-azul rounded-md font-semibold hover:bg-liga-amarillo/90 flex items-center gap-1 text-sm"
                      title="Generar contraseña aleatoria"
                    >
                      <RefreshCw size={16} />
                      Generar
                    </button>
                  </div>
                  {errores.password && (
                    <p className="text-xs text-red-500 mt-1">{errores.password}</p>
                  )}
                  <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-500 p-2 rounded text-xs text-yellow-800">
                    <strong>⚠️ Importante:</strong> Copia esta contraseña. No se
                    mostrará de nuevo.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECCIÓN: Rol */}
          <section>
            <h3 className="text-sm font-bold text-liga-azul uppercase mb-3 pb-2 border-b">
              Rol en el Sistema
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                value={form.rol}
                onChange={(e) => {
                  actualizarCampo('rol', e.target.value)
                  const nuevoRol = ROLES.find((r) => r.value === e.target.value)
                  if (!nuevoRol?.requiereClub) {
                    actualizarCampo('club_id', '')
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                  errores.rol ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.emoji} {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Club (solo si el rol lo requiere) */}
            {requiereClub && (
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Club asignado <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.club_id}
                  onChange={(e) => actualizarCampo('club_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                    errores.club_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar club...</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.disciplina} · {eq.categoria})
                    </option>
                  ))}
                </select>
                {errores.club_id && (
                  <p className="text-xs text-red-500 mt-1">{errores.club_id}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Este usuario solo verá los datos de este club
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer sticky */}
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
                {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}