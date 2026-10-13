import Header from './Header'
import Sidebar from './Sidebar'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }) {
  const { usuario } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <Header />
      <div className="flex">
        <Sidebar usuario={usuario} />
        <main className="flex-1 p-3 sm:p-6 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}