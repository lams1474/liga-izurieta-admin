/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Camera,
  Image as ImageIcon,
  Loader,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { comprimirImagen, validarImagen } from '../lib/imagenUtils'
import { subirEscudo } from '../lib/escudoUtils'
import toast from 'react-hot-toast'

export default function MiClub() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [club, setClub] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    calificados: 0,
    noCalificados: 0,
    conFoto: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [subiendoEscudo, setSubiendoEscudo] = useState(false)
  const [previewEscudo, setPreviewEscudo] = useState(null)

  const inputEscudoRef = useRef(null)
  const inputCamaraRef = useRef(null)

  const clubId = usuario?.club_id

  // Cargar datos del club
  async function cargarDatos() {
    if (!clubId) {
      setCargando(false)
      return
    }

    try {
      // 1. Cargar info del club
      const { data: clubData, error: clubError } = await supabase
        .from('equipos')
        .select('id, nombre, disciplina, categoria, escudo_url, colores')
        .eq('id', clubId)
        .single()

      if (clubError) throw clubError
      setClub(clubData)

      // 2. Cargar estadísticas de jugadores
      const { data: jugadoresData, error: jugadoresError } = await supabase
        .from('jugador_equipo')
        .select(`
          id,
          jugador:jugadores!jugador_equipo_jugador_id_fkey (
            calificado,
            foto_actualizada
          )
        `)
        .eq('equipo_id', clubId)
        .eq('activo', true)

      if (jugadoresError) throw jugadoresError

      const listaJugadores = (jugadoresData || [])
        .filter((j) => j.jugador)
        .map((j) => j.jugador)

      setEstadisticas({
        total: listaJugadores.length,
        calificados: listaJugadores.filter((j) => j.calificado).length,
        noCalificados: listaJugadores.filter((j) => !j.calificado).length,
        conFoto: listaJugadores.filter((j) => j.foto_actualizada).length,
      })
    } catch (err) {
      console.error('Error cargando datos:', err)
      toast.error('Error al cargar los datos del club')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId])

  // ============ MANEJO DE ESCUDO ============

  async function handleEscudoSeleccionado(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const validacion = validarImagen(file, 5)
    if (!validacion.valido) {
      toast.error(validacion.error)
      e.target.value = ''
      return
    }

    setSubiendoEscudo(true)
    toast.loading('Comprimiendo escudo...', { id: 'escudo' })

    try {
      // Comprimir imagen (escudos suelen ser cuadrados, ajustamos)
      const comprimida = await comprimirImagen(file, {
        maxAncho: 500,
        maxAlto: 500,
        calidad: 0.9,
      })

      const tamanoKB = (comprimida.size / 1024).toFixed(0)
      toast.success(`Escudo listo (${tamanoKB} KB)`, { id: 'escudo' })

      // Vista previa
      const reader = new FileReader()
      reader.onload = (ev) => setPreviewEscudo(ev.target.result)
      reader.readAsDataURL(comprimida)

      // Subir a Storage
      toast.loading('Subiendo escudo...', { id: 'subir-escudo' })
      const url = await subirEscudo(comprimida, clubId)
      toast.success('Escudo subido', { id: 'subir-escudo' })

      // Actualizar URL en la tabla equipos
      const { error: updateError } = await supabase
        .from('equipos')
        .update({ escudo_url: url })
        .eq('id', clubId)

      if (updateError) throw updateError

      toast.success('¡Escudo actualizado correctamente!')
      
      // Recargar
      await cargarDatos()
      setPreviewEscudo(null)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al subir el escudo', { id: 'escudo' })
    } finally {
      setSubiendoEscudo(false)
      e.target.value = ''
    }
  }

  // ============ RENDER ============

  if (!clubId) {
    return (
      <div className="max-w-4xl">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-yellow-800 mb-2">
                No tienes un club asignado
              </h2>
              <p className="text-sm text-yellow-700">
                Contacta al administrador de la liga para que te asigne a un club.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-liga-azul mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando información del club...</p>
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <p className="text-red-700">Error al cargar la información del club.</p>
        </div>
      </div>
    )
  }

  const escudoMostrar = previewEscudo || club.escudo_url

  return (
    <div className="max-w-5xl">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Mi Club</h1>
        <p className="text-gray-500 text-sm mt-1">Información y estadísticas de tu equipo</p>
      </div>

      {/* Tarjeta principal del club */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Escudo */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-liga-azul bg-gray-100 flex items-center justify-center overflow-hidden">
              {escudoMostrar ? (
                <img
                  src={escudoMostrar}
                  alt={club.nombre}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Shield size={48} className="text-gray-400" />
              )}
            </div>

            {/* Botones para cambiar escudo (solo si es presidente) */}
            {usuario?.rol === 'delegado' && (
              <div className="absolute -bottom-2 right-0 flex gap-1">
                <button
                  onClick={() => inputCamaraRef.current?.click()}
                  disabled={subiendoEscudo}
                  className="bg-liga-azul text-white p-1.5 rounded-full shadow-md hover:bg-liga-azul/90 disabled:opacity-50"
                  title="Tomar foto"
                >
                  {subiendoEscudo ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <button
                  onClick={() => inputEscudoRef.current?.click()}
                  disabled={subiendoEscudo}
                  className="bg-gray-200 text-gray-700 p-1.5 rounded-full shadow-md hover:bg-gray-300 disabled:opacity-50"
                  title="Subir archivo"
                >
                  <ImageIcon size={14} />
                </button>
              </div>
            )}

            {/* Inputs ocultos */}
            <input
              ref={inputEscudoRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleEscudoSeleccionado}
              className="hidden"
            />
            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleEscudoSeleccionado}
              className="hidden"
            />
          </div>

          {/* Info del club */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-800">{club.nombre}</h2>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
              <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
                {club.disciplina}
              </span>
              <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-semibold">
                {club.categoria}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Esta información la administra la Secretaría de la Liga. Si necesitas cambiar
              el nombre o la categoría, contacta al administrador.
            </p>

            <button
              onClick={() => navigate('/mis-jugadores')}
              className="mt-4 bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center justify-center md:justify-start gap-2 transition-colors w-full md:w-auto"
            >
              <Users size={18} />
              Gestionar Jugadores
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <h3 className="text-lg font-bold text-liga-azul mb-3">Resumen de Plantilla</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Total */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users size={22} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{estadisticas.total}</p>
          <p className="text-xs text-gray-500">Jugadores totales</p>
        </div>

        {/* Calificados */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={22} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{estadisticas.calificados}</p>
          <p className="text-xs text-gray-500">Calificados</p>
        </div>

        {/* No calificados */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-red-100 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <XCircle size={22} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{estadisticas.noCalificados}</p>
          <p className="text-xs text-gray-500">No calificados</p>
        </div>

        {/* Con foto */}
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <div className="bg-yellow-100 text-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
            <Camera size={22} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{estadisticas.conFoto}</p>
          <p className="text-xs text-gray-500">Con foto</p>
        </div>
      </div>
    </div>
  )
}