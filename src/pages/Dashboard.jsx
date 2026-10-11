import { useAuth } from '../contexts/AuthContext'
import { User } from 'lucide-react'

const nombresRol = {
  admin: 'Administrador',
  secretaria: 'Secretaría',
  vocal: 'Vocal del Partido',
  arbitro: 'Árbitro',
  delegado: 'Presidente de Club',
  capitan: 'Capitán',
}

export default function Dashboard() {
  const { usuario } = useAuth()

  if (!usuario) return null

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-liga-azul text-white p-3 rounded-full">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-liga-azul">
              ¡Bienvenido, {usuario.nombres}!
            </h2>
            <p className="text-gray-500">
              Rol: <strong>{nombresRol[usuario.rol] || usuario.rol}</strong>
            </p>
          </div>
        </div>

        {usuario.club && (
          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>Tu club:</strong> {usuario.club.nombre}
            </p>
            <p className="text-xs text-blue-600">
              {usuario.club.disciplina} · {usuario.club.categoria}
            </p>
          </div>
        )}

        <div className="border-t pt-6">
          <p className="text-gray-600">
            Selecciona un módulo del menú lateral para comenzar.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-liga-azul p-4 rounded">
        <p className="text-sm text-blue-800">
          💡 <strong>Sistema en construcción:</strong> Los módulos se irán habilitando progresivamente.
        </p>
      </div>
    </div>
  )
}