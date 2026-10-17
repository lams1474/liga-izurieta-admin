import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Shield, UserPlus, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegistroJugador() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    cedula: '',
    fecha_nacimiento: '',
    email: '',
    password: '',
    confirmarPassword: '',
  })

  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errores, setErrores] = useState({})

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: null }))
  }

  function validar() {
    const nuevosErrores = {}

    if (!form.cedula.trim()) {
      nuevosErrores.cedula = 'Obligatorio'
    } else if (!/^\d{10}$/.test(form.cedula)) {
      nuevosErrores.cedula = 'Debe tener 10 dígitos'
    }

    if (!form.fecha_nacimiento) {
      nuevosErrores.fecha_nacimiento = 'Obligatorio'
    }

    if (!form.email.trim()) {
      nuevosErrores.email = 'Obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nuevosErrores.email = 'Email inválido'
    }

    if (!form.password) {
      nuevosErrores.password = 'Obligatorio'
    } else if (form.password.length < 8) {
      nuevosErrores.password = 'Mínimo 8 caracteres'
    }

    if (form.password !== form.confirmarPassword) {
      nuevosErrores.confirmarPassword = 'Las contraseñas no coinciden'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function handleRegistro(e) {
    e.preventDefault()

    if (!validar()) {
      toast.error('Revisa los campos marcados')
      return
    }

    setCargando(true)

    try {
      // Llamar a la Edge Function
      const { data, error } = await supabase.functions.invoke('registro-jugador', {
        body: {
          cedula: form.cedula.trim(),
          fecha_nacimiento: form.fecha_nacimiento,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error)
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Error al crear la cuenta')
      }

      toast.success('¡Cuenta creada! Iniciando sesión...')

      // Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })

      if (loginError) {
        toast.error('Cuenta creada pero error al iniciar sesión. Ingresa manualmente.')
        navigate('/login')
        return
      }

      toast.success('¡Bienvenido!')
      navigate('/mi-carnet')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al crear la cuenta')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-liga-azul to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-liga-azul text-white px-6 py-6 text-center">
          <div className="bg-liga-amarillo text-liga-azul w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold">Registro de Jugador</h1>
          <p className="text-sm text-liga-amarillo mt-1">
            Liga Deportiva Barrial José Ignacio Izurieta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegistro} className="p-6 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-xs text-blue-800">
            <p className="font-semibold mb-1">📋 Importante</p>
            <p>
              Ingresa la misma cédula y fecha de nacimiento que tu delegado registró
              en la liga. Deben coincidir exactamente.
            </p>
          </div>

          {/* Cédula */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cédula <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.cedula}
              onChange={(e) =>
                actualizarCampo('cedula', e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-mono ${
                errores.cedula ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0501234567"
              maxLength={10}
            />
            {errores.cedula && (
              <p className="text-xs text-red-500 mt-1">{errores.cedula}</p>
            )}
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Fecha de Nacimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.fecha_nacimiento}
              onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                errores.fecha_nacimiento ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errores.fecha_nacimiento && (
              <p className="text-xs text-red-500 mt-1">{errores.fecha_nacimiento}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => actualizarCampo('email', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                errores.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="tu@correo.com"
            />
            {errores.email && (
              <p className="text-xs text-red-500 mt-1">{errores.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => actualizarCampo('password', e.target.value)}
                className={`w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                  errores.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errores.password && (
              <p className="text-xs text-red-500 mt-1">{errores.password}</p>
            )}
          </div>

          {/* Confirmar password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type={mostrarPassword ? 'text' : 'password'}
              value={form.confirmarPassword}
              onChange={(e) => actualizarCampo('confirmarPassword', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul ${
                errores.confirmarPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Repite la contraseña"
            />
            {errores.confirmarPassword && (
              <p className="text-xs text-red-500 mt-1">{errores.confirmarPassword}</p>
            )}
          </div>

          {/* Botón Registro */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-liga-azul text-white py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creando cuenta...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Crear mi cuenta
              </>
            )}
          </button>

          {/* Volver al login */}
          <div className="text-center pt-2 border-t">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-liga-azul font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}