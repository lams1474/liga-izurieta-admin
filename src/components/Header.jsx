import { useNavigate } from 'react-router-dom'
import { LogOut, User, Home } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const nombresRol = {
  admin: 'Administrador',
  secretaria: 'Secretaría',
  vocal: 'Vocal',
  arbitro: 'Árbitro',
  delegado: 'Presidente',
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
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        {/* Logo + Título */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 flex-1"
        >
          <Home size={20} className="text-liga-amarillo flex-shrink-0" />
          <div className="text-left min-w-0">
            <h1 className="text-sm sm:text-lg font-bold leading-tight truncate">
              Sistema Liga Izurieta
            </h1>
            <p className="text-[10px] sm:text-xs text-liga-amarillo">
              Panel Administrativo
            </p>
          </div>
        </button>

        {/* Usuario + Salir */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold truncate max-w-[150px]">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="text-xs text-liga-amarillo">
              {nombresRol[usuario.rol] || usuario.rol}
            </p>
          </div>

          <div className="bg-liga-amarillo text-liga-azul p-1.5 sm:p-2 rounded-full">
            <User size={18} />
          </div>

          <button
            onClick={handleLogout}
            className="bg-liga-rojo hover:bg-liga-rojo/80 px-2 sm:px-3 py-2 rounded-md flex items-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}