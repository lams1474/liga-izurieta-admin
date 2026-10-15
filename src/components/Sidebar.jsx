import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Users, Building2, DollarSign, Calendar, AlertTriangle,
  FileText, BarChart3, Settings, UserCog, ClipboardList, PlayCircle,
  QrCode, MessageSquare, Target, PenTool, ShieldCheck, BookUser,
  Menu, X,
} from 'lucide-react'

const menusPorRol = {
  admin: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/jugadores', label: 'Jugadores', icon: Users },
    { path: '/equipos', label: 'Equipos', icon: Building2 },
    { path: '/pagos', label: 'Pagos', icon: DollarSign },
    { path: '/calendario', label: 'Calendario', icon: Calendar },
    { path: '/sanciones', label: 'Sanciones', icon: AlertTriangle },
    { path: '/actas', label: 'Actas', icon: FileText },
    { path: '/reportes', label: 'Reportes', icon: BarChart3 },
    { path: '/usuarios', label: 'Usuarios', icon: UserCog },
    { path: '/configuracion', label: 'Configuración', icon: Settings },
  ],
  secretaria: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/jugadores', label: 'Jugadores', icon: Users },
    { path: '/equipos', label: 'Equipos', icon: Building2 },
    { path: '/pagos', label: 'Pagos', icon: DollarSign },
    { path: '/calendario', label: 'Calendario', icon: Calendar },
    { path: '/sanciones', label: 'Sanciones', icon: AlertTriangle },
    { path: '/actas', label: 'Actas', icon: FileText },
    { path: '/reportes', label: 'Reportes', icon: BarChart3 },
  ],
  delegado: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/mis-jugadores', label: 'Mis Jugadores', icon: Users },
    { path: '/mi-club', label: 'Mi Club', icon: ShieldCheck },
    { path: '/mis-pases', label: 'Mis Pases', icon: BookUser },
    { path: '/mi-nomina', label: 'Mi Nómina', icon: FileText },
  ],
  jugador: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/mi-carnet', label: 'Mi Carnet Digital', icon: QrCode },
    { path: '/calendario', label: 'Mi Próximo Partido', icon: Calendar },
    { path: '/sanciones', label: 'Mis Sanciones', icon: AlertTriangle },
  ],
  capitan: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/mi-carnet', label: 'Mi Carnet Digital', icon: QrCode },
    { path: '/cerrar-acta', label: 'Cerrar Acta', icon: PenTool },
  ],
  vocal: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/planilla', label: 'Planilla de Juego', icon: ClipboardList },
    { path: '/partido', label: 'Partido en Curso', icon: PlayCircle },
    { path: '/validar-carnets', label: 'Validar Carnets', icon: QrCode },
    { path: '/novedades', label: 'Novedades', icon: MessageSquare },
  ],
  arbitro: [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/partido', label: 'Partido en Curso', icon: PlayCircle },
    { path: '/tarjetas', label: 'Registrar Tarjetas', icon: AlertTriangle },
    { path: '/goles', label: 'Registrar Goles', icon: Target },
    { path: '/novedades', label: 'Novedades', icon: MessageSquare },
  ],
}

export default function Sidebar({ usuario }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuMovilAbierto(false)
  }, [location.pathname])

  if (!usuario) return null

  const menu = menusPorRol[usuario.rol] || []

  function handleNavegar(path) {
    navigate(path)
    setMenuMovilAbierto(false)
  }

  return (
    <>
      {/* ================= BOTÓN HAMBURGUESA (solo móvil) ================= */}
      <button
        onClick={() => setMenuMovilAbierto(true)}
        className="md:hidden fixed bottom-4 right-4 z-50 bg-liga-azul text-white p-3 rounded-full shadow-2xl hover:bg-liga-azul/90 transition-all"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* ================= SIDEBAR DESKTOP ================= */}
      <aside className="bg-white shadow-md w-64 min-h-[calc(100vh-64px)] hidden md:block">
        <nav className="py-4">
          {menu.map((item) => {
            const Icon = item.icon
            const activo = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => handleNavegar(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                  activo
                    ? 'bg-liga-azul text-white border-r-4 border-liga-amarillo'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ================= OVERLAY MÓVIL ================= */}
      {menuMovilAbierto && (
        <div
          onClick={() => setMenuMovilAbierto(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* ================= SIDEBAR MÓVIL (drawer) ================= */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          menuMovilAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header del menú */}
        <div className="bg-liga-azul text-white px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold">Menú</h2>
            <p className="text-xs text-liga-amarillo capitalize">{usuario.rol}</p>
          </div>
          <button
            onClick={() => setMenuMovilAbierto(false)}
            className="p-2 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items del menú */}
        <nav className="py-2 overflow-y-auto h-[calc(100%-70px)]">
          {menu.map((item) => {
            const Icon = item.icon
            const activo = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => handleNavegar(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                  activo
                    ? 'bg-liga-azul text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}