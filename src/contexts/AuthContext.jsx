import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarUsuario = useCallback(async (userId) => {
    try {
      // 1. Buscar en usuarios (para admin, secretaria, delegado, etc.)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          id, nombres, apellidos, email, rol, activo, club_id, telefono,
          club:equipos!usuarios_club_id_fkey (id, nombre, disciplina, categoria)
        `)
        .eq('id', userId)
        .maybeSingle()

      // 2. Buscar también en jugadores por user_id
      const { data: jugadorData } = await supabase
        .from('jugadores')
        .select(`
          id, nombres, apellidos, cedula, foto_url, carnet_pagado, calificado,
          inscripciones:jugador_equipo (
            id, dorsal, activo,
            equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria, escudo_url)
          )
        `)
        .eq('user_id', userId)
        .maybeSingle()

      // 3. Decidir el rol:
      //    - Si está en usuarios Y es distinto de 'jugador' → usar usuarios
      //    - Si está en jugadores → usar datos del jugador
      //    - Si está en ambos → preferir jugadores si el rol es 'jugador'
      if (usuarioData && usuarioData.activo && usuarioData.rol !== 'jugador') {
        setUsuario(usuarioData)
      } else if (jugadorData) {
        setUsuario({
          id: jugadorData.id,
          nombres: jugadorData.nombres,
          apellidos: jugadorData.apellidos,
          email: usuarioData?.email || null,
          rol: 'jugador',
          activo: true,
          club_id: null,
          telefono: null,
          jugador_id: jugadorData.id,        // ← IMPORTANTE
          cedula: jugadorData.cedula,        // ← IMPORTANTE
          foto_url: jugadorData.foto_url,
        })
      } else if (usuarioData && usuarioData.activo) {
        setUsuario(usuarioData)
      } else {
        // No se encontró en ninguna tabla → cerrar sesión
        await supabase.auth.signOut()
        setUsuario(null)
      }
    } catch (err) {
      console.error('Error cargando usuario:', err)
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cargarUsuario(session.user.id)
      } else {
        setCargando(false)
      }
    })

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
  }, [cargarUsuario])

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