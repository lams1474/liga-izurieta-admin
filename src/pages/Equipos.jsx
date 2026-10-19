/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Upload, Users, Power, X, Search, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { comprimirImagen, validarImagen } from '../lib/imagenUtils'
import { subirEscudo } from '../lib/escudoUtils'

export default function Equipos() {
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Estados para el modal de la plantilla
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null)
  const [jugadores, setJugadores] = useState([])
  const [cargandoJugadores, setCargandoJugadores] = useState(false)

  // Estados para la subida de escudo
  const [subiendoEscudo, setSubiendoEscudo] = useState(null)
  const fileInputRef = useRef(null)
  const [equipoParaEscudo, setEquipoParaEscudo] = useState(null)

  // Cargar equipos
  async function cargarEquipos() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      setEquipos(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar equipos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  // Ver plantilla de jugadores
  async function verPlantilla(equipo) {
    setEquipoSeleccionado(equipo)
    setCargandoJugadores(true)
    try {
      const { data, error } = await supabase
        .from('jugador_equipo')
        .select(`
          dorsal, posicion, activo,
          jugador:jugadores!jugador_equipo_jugador_id_fkey (
            id, apellidos, nombres, cedula, foto_url, calificado
          )
        `)
        .eq('equipo_id', equipo.id)
        .eq('activo', true)
      
      if (error) throw error
      
      const lista = (data || [])
        .filter(i => i.jugador)
        .map(i => ({ ...i.jugador, dorsal: i.dorsal, posicion: i.posicion }))
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos))

      setJugadores(lista)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la plantilla')
    } finally {
      setCargandoJugadores(false)
    }
  }

  // Activar / Desactivar Equipo
  async function toggleActivo(equipo) {
    const accion = equipo.activo ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Estás seguro de ${accion} el equipo ${equipo.nombre}?`)) return

    try {
      const { error } = await supabase
        .from('equipos')
        .update({ activo: !equipo.activo })
        .eq('id', equipo.id)
      
      if (error) throw error
      
      toast.success(`Equipo ${accion}do correctamente`)
      cargarEquipos()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar estado')
    }
  }

  // Manejo de subida de escudo
  function abrirSelectorEscudo(equipo) {
    setEquipoParaEscudo(equipo)
    fileInputRef.current?.click()
  }

  async function handleEscudoSeleccionado(e) {
    const file = e.target.files?.[0]
    if (!file || !equipoParaEscudo) return

    const validacion = validarImagen(file, 5)
    if (!validacion.valido) {
      toast.error(validacion.error)
      e.target.value = ''
      return
    }

    setSubiendoEscudo(equipoParaEscudo.id)
    toast.loading('Comprimiendo escudo...', { id: 'escudo' })

    try {
      const comprimida = await comprimirImagen(file, { maxAncho: 500, maxAlto: 500, calidad: 0.9 })
      
      toast.loading('Subiendo escudo...', { id: 'escudo' })
      
      const url = await subirEscudo(comprimida, equipoParaEscudo.id)
      
      const { error } = await supabase
        .from('equipos')
        .update({ escudo_url: url })
        .eq('id', equipoParaEscudo.id)
      
      if (error) throw error

      toast.success('¡Escudo actualizado!', { id: 'escudo' })
      cargarEquipos()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al subir escudo', { id: 'escudo' })
    } finally {
      setSubiendoEscudo(null)
      setEquipoParaEscudo(null)
      e.target.value = ''
    }
  }

  // Filtrar equipos
  const equiposFiltrados = equipos.filter(eq => {
    const texto = busqueda.toLowerCase()
    return eq.nombre.toLowerCase().includes(texto) || 
           eq.disciplina.toLowerCase().includes(texto) || 
           eq.categoria.toLowerCase().includes(texto)
  })

  if (cargando) return <div className="p-8 text-center text-gray-500">Cargando equipos...</div>

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Gestión de Equipos</h1>
          <p className="text-gray-500 text-sm mt-1">Administra los clubes, escudos y plantillas de la liga</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleEscudoSeleccionado}
        className="hidden"
      />

      {/* Grid de Equipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equiposFiltrados.map(equipo => (
          <div 
            key={equipo.id} 
            className={`bg-white rounded-lg shadow-md p-5 flex flex-col relative overflow-hidden transition-all ${
              !equipo.activo ? 'opacity-60 border-2 border-red-200' : 'border-2 border-transparent'
            }`}
          >
            {!equipo.activo && (
              <div className="absolute top-2 right-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                INACTIVO
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 flex-shrink-0 relative group">
                {subiendoEscudo === equipo.id ? (
                  <Loader size={24} className="text-liga-azul animate-spin" />
                ) : equipo.escudo_url ? (
                  <img src={equipo.escudo_url} alt={equipo.nombre} className="w-full h-full object-contain p-1" />
                ) : (
                  <Shield size={28} className="text-gray-400" />
                )}
                
                <button
                  onClick={() => abrirSelectorEscudo(equipo)}
                  disabled={subiendoEscudo === equipo.id}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Cambiar escudo"
                >
                  <Upload size={20} />
                </button>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg leading-tight">{equipo.nombre}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold uppercase">{equipo.disciplina}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold uppercase">{equipo.categoria}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t flex gap-2">
              <button 
                onClick={() => verPlantilla(equipo)}
                className="flex-1 bg-liga-azul text-white py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex justify-center items-center gap-2 text-sm transition-colors"
              >
                <Users size={16} /> Plantilla
              </button>
              <button 
                onClick={() => toggleActivo(equipo)}
                className={`px-3 py-2 rounded-md font-semibold flex justify-center items-center gap-2 text-sm transition-colors border ${
                  equipo.activo 
                    ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' 
                    : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                }`}
                title={equipo.activo ? 'Desactivar equipo' : 'Activar equipo'}
              >
                <Power size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: VER PLANTILLA */}
      {equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="bg-liga-azul text-white p-4 flex items-center justify-between rounded-t-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                {equipoSeleccionado.escudo_url ? (
                  <img src={equipoSeleccionado.escudo_url} alt="Escudo" className="w-10 h-10 object-contain bg-white rounded-full p-0.5" />
                ) : (
                  <Shield size={24} />
                )}
                <div>
                  <h2 className="text-xl font-bold leading-tight">{equipoSeleccionado.nombre}</h2>
                  <p className="text-xs text-liga-amarillo capitalize">{equipoSeleccionado.disciplina} · {equipoSeleccionado.categoria}</p>
                </div>
              </div>
              <button onClick={() => setEquipoSeleccionado(null)} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {cargandoJugadores ? (
                <div className="text-center py-12 text-gray-500">Cargando plantilla...</div>
              ) : jugadores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto text-gray-300 mb-2" />
                  Este equipo no tiene jugadores registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-center rounded-tl-md">Dorsal</th>
                        <th className="px-3 py-2 text-left">Jugador</th>
                        <th className="px-3 py-2 text-left">Cédula</th>
                        <th className="px-3 py-2 text-center rounded-tr-md">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jugadores.map(j => (
                        <tr key={j.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-center font-bold text-gray-700">{j.dorsal || '-'}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800">{j.apellidos} {j.nombres}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">{j.cedula}</td>
                          <td className="px-3 py-2 text-center">
                            {j.calificado ? (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">Calificado</span>
                            ) : (
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-semibold">No Calificado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-lg flex-shrink-0">
              <button onClick={() => setEquipoSeleccionado(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}