import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    try {
      await login(email, password)
      toast.success('Bienvenido')
      navigate('/')
    } catch (err) {
      toast.error('Credenciales incorrectas')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-liga-azul flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-liga-azul">
            Sistema Liga Izurieta
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Panel Administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-liga-azul text-white py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Botón de registro para jugadores */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-gray-600 mb-3">
            ¿Eres jugador y aún no tienes cuenta?
          </p>
          <Link
            to="/registro"
            className="inline-block w-full bg-liga-amarillo text-liga-azul py-3 rounded-md font-semibold hover:bg-liga-amarillo/90 transition-colors"
          >
            Regístrate aquí
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Sistema oficial - Liga Deportiva Barrial José Ignacio Izurieta
        </p>
      </div>
    </div>
  )
}