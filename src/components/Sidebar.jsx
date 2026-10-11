import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  UserCog,
  ClipboardList,
  PlayCircle,
  QrCode,
  MessageSquare,
  Target,
  PenTool,
  ShieldCheck,
  BookUser,
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
  capitan: [
    { path: '/', label: 'Inicio', icon: Home },
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

  if (!usuario) return null

  const menu = menusPorRol[usuario.rol] || []

  return (
    <aside className="bg-white shadow-md w-64 min-h-[calc(100vh-64px)] hidden md:block">
      <nav className="py-4">
        {menu.map((item) => {
          const Icon = item.icon
          const activo = location.pathname === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
  )
}