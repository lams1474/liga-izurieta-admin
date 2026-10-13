import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Plus, Filter, Eye, Edit, UserCog, Shield, KeyRound, Users as UsersIcon } from 'lucide-react'
import toast from 'react-hot-toast'

// Configuración visual por rol
const ROLES_CONFIG = {
  admin: {
    label: 'Administrador',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    emoji: '👑',
  },
  secretaria: {
    label: 'Secretaría',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    emoji: '📋',
  },
  delegado: {
    label: 'Presidente',
    color: 'bg-green-100 text-green-700 border-green-300',
    emoji: '🏛️',
  },
  vocal: {
    label: 'Vocal',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    emoji: '📢',
  },
  arbitro: {
    label: 'Árbitro',
    color: 'bg-red-100 text-red-700 border-red-300',
    emoji: '🟥',
  },
  capitan: {
    label: 'Capitán',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    emoji: '⚽',
  },
  jugador: {
    label: 'Jugador',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    emoji: '👤',
  },
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')

  // Cargar usuarios
  async function recargar() {
    setCargando(true)

    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nombres,
        apellidos,
        email,
        rol,
        telefono,
        activo,
        club_id,
        creado_en,
        club:equipos!usuarios_club_id_fkey (id, nombre, disciplina, categoria)
      `)
      .order('rol')
      .order('apellidos')

    if (error) {
      console.error(error)
      toast.error('Error al cargar usuarios')
      setUsuarios([])
    } else {
      setUsuarios(data || [])
    }
    setCargando(false)
  }

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
    recargar()
  }, [])

  // Filtrar en el cliente
  const usuariosFiltrados = usuarios.filter((u) => {
    // Filtro por estado
    if (filtroEstado === 'activos' && !u.activo) return false
    if (filtroEstado === 'inactivos' && u.activo) return false

    // Filtro por rol
    if (filtroRol && u.rol !== filtroRol) return false

    // Búsqueda por nombre/email
    if (busqueda) {
      const texto = busqueda.toLowerCase()
      const nombreCompleto = `${u.apellidos} ${u.nombres}`.toLowerCase()
      if (!nombreCompleto.includes(texto) && !u.email.toLowerCase().includes(texto)) {
        return false
      }
    }

    return true
  })

  // Contadores por rol
  const contadores = {
    admin: usuarios.filter((u) => u.rol === 'admin').length,
    secretaria: usuarios.filter((u) => u.rol === 'secretaria').length,
    delegado: usuarios.filter((u) => u.rol === 'delegado').length,
    vocal: usuarios.filter((u) => u.rol === 'vocal').length,
    arbitro: usuarios.filter((u) => u.rol === 'arbitro').length,
    capitan: usuarios.filter((u) => u.rol === 'capitan').length,
  }

  return (
    <div className="max-w-7xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-liga-azul">Usuarios del Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">
            {cargando
              ? 'Cargando...'
              : `${usuariosFiltrados.length} de ${usuarios.length} usuarios`}
          </p>
        </div>

        <button
          onClick={() => toast.info('Próximamente: formulario de crear usuario')}
          className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Agregar Usuario
        </button>
      </div>

      {/* Tarjetas de resumen por rol */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(ROLES_CONFIG).slice(0, 6).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFiltroRol(filtroRol === key ? '' : key)}
            className={`bg-white rounded-lg shadow-md p-3 text-center hover:shadow-lg transition-all border-2 ${
              filtroRol === key ? 'border-liga-azul' : 'border-transparent'
            }`}
          >
            <div className="text-2xl">{config.emoji}</div>
            <div className="text-xs text-gray-600 mt-1">{config.label}</div>
            <div className="text-xl font-bold text-liga-azul mt-1">
              {contadores[key] || 0}
            </div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-700">
          <Filter size={18} />
          <span className="font-semibold">Filtros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            />
          </div>

          {/* Rol */}
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="secretaria">Secretaría</option>
            <option value="delegado">Presidente</option>
            <option value="vocal">Vocal</option>
            <option value="arbitro">Árbitro</option>
            <option value="capitan">Capitán</option>
          </select>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        {(busqueda || filtroRol || filtroEstado !== 'activos') && (
          <button
            onClick={() => {
              setBusqueda('')
              setFiltroRol('')
              setFiltroEstado('activos')
            }}
            className="mt-3 text-sm text-liga-rojo hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liga-azul mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando usuarios...</p>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            {usuarios.length === 0
              ? 'No hay usuarios registrados'
              : 'No se encontraron usuarios con esos filtros'}
          </h2>
          <p className="text-gray-500">
            {usuarios.length === 0
              ? 'Crea el primer usuario con el botón "Agregar Usuario"'
              : 'Prueba con otros filtros'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-liga-azul text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Usuario
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Email
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Rol
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase">
                    Club
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Estado
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const config = ROLES_CONFIG[u.rol] || ROLES_CONFIG.jugador

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-800">
                          {u.apellidos} {u.nombres}
                        </div>
                        {u.telefono && (
                          <div className="text-xs text-gray-500">
                            📱 {u.telefono}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {u.email}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}
                        >
                          <span>{config.emoji}</span>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {u.club ? (
                          <div>
                            <div className="font-semibold text-gray-700">
                              {u.club.nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {u.club.disciplina} · {u.club.categoria}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.activo ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                            ✓ Activo
                          </span>
                        ) : (
                          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-semibold">
                            ⏸ Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toast.info('Próximamente: detalle de usuario')}
                            className="p-2 text-liga-azul hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => toast.info('Próximamente: editar usuario')}
                            className="p-2 text-liga-azul hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}