/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Shield, Users, Edit, Search, Filter, X, Save, Image as ImageIcon, Loader, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { comprimirImagen, validarImagen } from '../lib/imagenUtils'
import { subirEscudo } from '../lib/escudoUtils'

export default function Equipos() {
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  // Modales
  const [modalPlantilla, setModalPlantilla] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null)
  
  // Datos de plantilla y edición
  const [plantilla, setPlantilla] = useState([])
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false)
  const [formEditar, setFormEditar] = useState({ nombre: '', colores: '', escudo_url: '' })
  const [guardando, setGuardando] = useState(false)
  const [subiendoEscudo, setSubiendoEscudo] = useState(false)

  const inputEscudoRef = useRef(null)

  // Cargar equipos
  async function cargarEquipos() {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select(`
          id, nombre, disciplina, categoria, colores, escudo_url,
          jugadores:jugador_equipo(count)
        `)
        .eq('activo', true)
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

  // Filtrar en el cliente
  const equiposFiltrados = equipos.filter(eq => {
    if (filtroDisciplina && eq.disciplina !== filtroDisciplina) return false
    if (filtroCategoria && eq.categoria !== filtroCategoria) return false
    if (busqueda && !eq.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  // Ver Plantilla
  async function verPlantilla(equipo) {
    setEquipoSeleccionado(equipo)
    setModalPlantilla(true)
    setCargandoPlantilla(true)
    try {
      const { data, error } = await supabase
        .from('jugador_equipo')
        .select(`
          dorsal, posicion,
          jugador:jugadores!jugador_equipo_jugador_id_fkey (
            id, apellidos, nombres, cedula, es_menor, calificado
          )
        `)
        .eq('equipo_id', equipo.id)
        .eq('activo', true)

      if (error) throw error
      
      const lista = (data || [])
        .filter(i => i.jugador)
        .map(i => ({ ...i.jugador, dorsal: i.dorsal, posicion: i.posicion }))
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos))
        
      setPlantilla(lista)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la plantilla')
    } finally {
      setCargandoPlantilla(false)
    }
  }

  // Abrir Edición
  function abrirEditar(equipo) {
    setEquipoSeleccionado(equipo)
    setFormEditar({ 
      nombre: equipo.nombre, 
      colores: equipo.colores || '', 
      escudo_url: equipo.escudo_url || '' 
    })
    setModalEditar(true)
  }

  // Subir Escudo (Admin)
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
    toast.loading('Comprimiendo escudo...', { id: 'escudo-admin' })

    try {
      const comprimida = await comprimirImagen(file, { maxAncho: 500, maxAlto: 500, calidad: 0.9 })
      const url = await subirEscudo(comprimida, equipoSeleccionado.id)
      
      setFormEditar(prev => ({ ...prev, escudo_url: url }))
      toast.success('Escudo subido. Guarda los cambios.', { id: 'escudo-admin' })
    } catch (err) {
      console.error(err)
      toast.error('Error al subir escudo', { id: 'escudo-admin' })
    } finally {
      setSubiendoEscudo(false)
      e.target.value = ''
    }
  }

  // Guardar Edición
  async function guardarEdicion(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('equipos')
        .update({
          nombre: formEditar.nombre.toUpperCase(),
          colores: formEditar.colores,
          escudo_url: formEditar.escudo_url
        })
        .eq('id', equipoSeleccionado.id)

      if (error) throw error
      
      toast.success('Equipo actualizado')
      setModalEditar(false)
      cargarEquipos()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar el equipo')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-8 text-center">Cargando equipos...</div>

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Gestión de Equipos</h1>
        <p className="text-gray-500 text-sm mt-1">Administra los clubes, categorías y plantillas</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-gray-700">
          <Filter size={18} />
          <span className="font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar club..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            />
          </div>
          <select
            value={filtroDisciplina}
            onChange={(e) => setFiltroDisciplina(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="">Todas las disciplinas</option>
            <option value="futbol">Fútbol</option>
            <option value="futsala">Futsala</option>
            <option value="ecuavoly">Ecuavoly</option>
          </select>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
          >
            <option value="">Todas las categorías</option>
            <option value="hombres">Hombres</option>
            <option value="mujeres">Mujeres</option>
            <option value="sub12">Sub-12</option>
            <option value="master40">Master 40</option>
          </select>
        </div>
        {(busqueda || filtroDisciplina || filtroCategoria) && (
          <button onClick={() => { setBusqueda(''); setFiltroDisciplina(''); setFiltroCategoria('') }} className="mt-3 text-sm text-liga-rojo hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid de Equipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equiposFiltrados.map(eq => {
          const countJugadores = eq.jugadores?.[0]?.count || 0
          return (
            <div key={eq.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col items-center text-center border-t-4 border-liga-azul">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-3 overflow-hidden border-2 border-gray-200">
                {eq.escudo_url ? (
                  <img src={eq.escudo_url} alt={eq.nombre} className="w-full h-full object-contain p-1" />
                ) : (
                  <Shield size={32} className="text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-800">{eq.nombre}</h3>
              <p className="text-sm text-gray-500 capitalize">{eq.disciplina} · {eq.categoria}</p>
              
              <div className="flex items-center gap-1 mt-2 text-sm font-semibold text-liga-azul bg-blue-50 px-3 py-1 rounded-full">
                <Users size={14} /> {countJugadores} jugadores
              </div>

              <div className="flex gap-2 w-full mt-4 pt-4 border-t">
                <button onClick={() => verPlantilla(eq)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm font-semibold hover:bg-gray-200 flex items-center justify-center gap-1">
                  <Eye size={16} /> Plantilla
                </button>
                <button onClick={() => abrirEditar(eq)} className="flex-1 bg-liga-azul text-white py-2 rounded-md text-sm font-semibold hover:bg-liga-azul/90 flex items-center justify-center gap-1">
                  <Edit size={16} /> Editar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {equiposFiltrados.length === 0 && (
        <div className="text-center p-12 text-gray-500 bg-white rounded-lg shadow-md">
          No se encontraron equipos con esos filtros.
        </div>
      )}

      {/* ================= MODAL: VER PLANTILLA ================= */}
      {modalPlantilla && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="bg-liga-azul text-white p-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h3 className="text-xl font-bold">Plantilla: {equipoSeleccionado.nombre}</h3>
                <p className="text-xs text-liga-amarillo capitalize">{equipoSeleccionado.disciplina} · {equipoSeleccionado.categoria}</p>
              </div>
              <button onClick={() => setModalPlantilla(false)} className="p-2 hover:bg-white/20 rounded-md"><X size={20} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {cargandoPlantilla ? (
                <div className="text-center py-8 text-gray-500">Cargando jugadores...</div>
              ) : plantilla.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Este equipo no tiene jugadores registrados.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Dorsal</th>
                      <th className="px-3 py-2 text-left">Jugador</th>
                      <th className="px-3 py-2 text-left">Cédula</th>
                      <th className="px-3 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {plantilla.map(j => (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-bold text-center">{j.dorsal || '-'}</td>
                        <td className="px-3 py-2 font-semibold">{j.apellidos} {j.nombres}</td>
                        <td className="px-3 py-2 text-gray-500">{j.cedula}</td>
                        <td className="px-3 py-2 text-center">
                          {j.calificado ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Calificado</span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">No Calificado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR EQUIPO ================= */}
      {modalEditar && equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={guardarEdicion} className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-liga-azul mb-4">Editar Equipo</h3>
            
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 rounded-full border-4 border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden mb-2">
                {formEditar.escudo_url ? (
                  <img src={formEditar.escudo_url} alt="Escudo" className="w-full h-full object-contain" />
                ) : (
                  <Shield size={32} className="text-gray-400" />
                )}
                {subiendoEscudo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader className="text-white animate-spin" size={24} />
                  </div>
                )}
              </div>
              <button type="button" onClick={() => inputEscudoRef.current?.click()} disabled={subiendoEscudo} className="text-sm font-semibold text-liga-azul hover:underline flex items-center gap-1">
                <ImageIcon size={14} /> Cambiar Escudo
              </button>
              <input type="file" ref={inputEscudoRef} accept="image/*" onChange={handleEscudoSeleccionado} className="hidden" />
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Club</label>
                <input required type="text" value={formEditar.nombre} onChange={e => setFormEditar({...formEditar, nombre: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-liga-azul focus:border-liga-azul" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Colores (Opcional)</label>
                <input type="text" placeholder="Ej: Azul y Blanco" value={formEditar.colores} onChange={e => setFormEditar({...formEditar, colores: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-liga-azul focus:border-liga-azul" />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setModalEditar(false)} disabled={guardando} className="flex-1 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={guardando || subiendoEscudo} className="flex-1 bg-liga-azul text-white py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex justify-center items-center gap-2">
                {guardando ? 'Guardando...' : <><Save size={18} /> Guardar</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}