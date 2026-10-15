import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  async function cargarUsuario(userId) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id, nombres, apellidos, email, rol, activo, club_id, telefono,
          club:equipos!usuarios_club_id_fkey (id, nombre, disciplina, categoria)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error

      if (!data.activo) {
        await supabase.auth.signOut()
        setUsuario(null)
      } else {
        setUsuario(data)
      }
    } catch (err) {
      console.error('Error cargando usuario:', err)
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cargarUsuario(session.user.id)
      } else {
        setCargando(false)
      }
    })

    // Escuchar cambios de sesión
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          cargarUsuario(session.user.id)
        } else {
          setUsuario(null)
          setCargando(false)
        }
      }
    )

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function logout() {
    await supabase.auth.signOut()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        login,
        logout,
        estaAutenticado: !!usuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}