import { useNavigate } from 'react-router-dom'
import { LogOut, User, Home } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const nombresRol = {
  admin: 'Administrador',
  secretaria: 'Secretaría',
  vocal: 'Vocal del Partido',
  arbitro: 'Árbitro',
  delegado: 'Presidente de Club',
  capitan: 'Capitán',
}

export default function Header() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  if (!usuario) return null

  return (
    <header className="bg-liga-azul text-white shadow-lg sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo + Título */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Home size={22} className="text-liga-amarillo" />
            <div className="text-left">
              <h1 className="text-lg font-bold leading-tight">
                Sistema Liga Izurieta
              </h1>
              <p className="text-xs text-liga-amarillo">
                Panel Administrativo
              </p>
            </div>
          </button>
        </div>

        {/* Usuario + Salir */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="text-xs text-liga-amarillo">
              {nombresRol[usuario.rol] || usuario.rol}
            </p>
          </div>

          <div className="bg-liga-amarillo text-liga-azul p-2 rounded-full">
            <User size={20} />
          </div>

          <button
            onClick={handleLogout}
            className="bg-liga-rojo hover:bg-liga-rojo/80 px-3 py-2 rounded-md flex items-center gap-2 transition-colors text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}