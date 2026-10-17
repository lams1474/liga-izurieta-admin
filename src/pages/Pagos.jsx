/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, DollarSign, CheckCircle, XCircle, CreditCard, User, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pagos() {
  const { usuario } = useAuth()
  
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  // Estados para el pago
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null)
  const [monto, setMonto] = useState('1.00')
  const [formaPago, setFormaPago] = useState('efectivo')
  const [registrando, setRegistrando] = useState(false)

  // Buscar jugadores
  async function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return

    setBuscando(true)
    setBuscado(true)
    setJugadorSeleccionado(null)

    const { data, error } = await supabase
      .from('jugadores')
      .select(`
        id,
        codigo_interno,
        apellidos,
        nombres,
        cedula,
        carnet_pagado,
        carnet_ano,
        carnet_pagado_en,
        inscripciones:jugador_equipo (
          activo,
          equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria)
        )
      `)
      .or(`cedula.ilike.%${busqueda.trim()}%,apellidos.ilike.%${busqueda.trim()}%,nombres.ilike.%${busqueda.trim()}%`)
      .eq('activo', true)
      .limit(10)

    if (error) {
      console.error(error)
      toast.error('Error al buscar')
    } else {
      setResultados(data || [])
    }
    setBuscando(false)
  }

  // Registrar el pago
  async function registrarPago() {
    if (!jugadorSeleccionado) return
    if (!monto || parseFloat(monto) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setRegistrando(true)
    try {
      // Llamar a la función de Supabase (RPC) que ya creamos
      const { error } = await supabase.rpc('registrar_pago_carnet', {
        p_jugador_id: jugadorSeleccionado.id,
        p_monto: parseFloat(monto),
        p_forma_pago: formaPago,
        p_referencia: 'Pago presencial en secretaría',
        p_registrado_por: usuario.id,
        p_observaciones: 'Cobro de carnet digital'
      })

      if (error) throw error

      toast.success('Pago registrado correctamente')
      
      // Actualizar la vista localmente
      setResultados(prev => prev.map(j => 
        j.id === jugadorSeleccionado.id 
          ? { ...j, carnet_pagado: true, carnet_ano: new Date().getFullYear(), carnet_pagado_en: new Date().toISOString() } 
          : j
      ))
      
      setJugadorSeleccionado(null)
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar pago: ' + err.message)
    } finally {
      setRegistrando(false)
    }
  }

  // Obtener equipo activo del jugador
  const obtenerEquipo = (jugador) => {
    const insc = jugador.inscripciones?.find(i => i.activo)
    return insc?.equipo
  }

  return (
    <div className="max-w-4xl">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Registro de Pagos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cobra el carnet digital de $1 a los jugadores
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={buscar} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cédula, apellidos o nombres..."
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul"
            />
          </div>
          <button
            type="submit"
            disabled={buscando || !busqueda.trim()}
            className="bg-liga-azul text-white px-6 py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 transition-colors"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Resultados de la búsqueda */}
      {buscado && !buscando && resultados.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-2" />
          No se encontraron jugadores con ese criterio.
        </div>
      )}

      {resultados.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700">Resultados ({resultados.length})</h3>
          
          {resultados.map((jugador) => {
            const equipo = obtenerEquipo(jugador)
            const pagadoEsteAno = jugador.carnet_pagado && jugador.carnet_ano === new Date().getFullYear()

            return (
              <div 
                key={jugador.id} 
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  pagadoEsteAno ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  {/* Info del jugador */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {jugador.codigo_interno}
                      </span>
                      {pagadoEsteAno ? (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <CheckCircle size={14} /> Carnet Pagado
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                          <XCircle size={14} /> Carnet Pendiente
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-800 text-lg">
                      {jugador.apellidos} {jugador.nombres}
                    </h4>
                    <p className="text-sm text-gray-600">C.C. {jugador.cedula}</p>
                    {equipo && (
                      <p className="text-xs text-gray-500 mt-1">
                        🏟️ {equipo.nombre} ({equipo.disciplina} · {equipo.categoria})
                      </p>
                    )}
                  </div>

                  {/* Acción de pago */}
                  <div>
                    {pagadoEsteAno ? (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Pagado el:</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(jugador.carnet_pagado_en).toLocaleDateString('es-EC')}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setJugadorSeleccionado(jugador)
                          setMonto('1.00')
                        }}
                        className="bg-liga-rojo text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-rojo/90 flex items-center gap-2 transition-colors w-full sm:w-auto"
                      >
                        <DollarSign size={18} />
                        Cobrar $1
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Cobro */}
      {jugadorSeleccionado && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-bold text-liga-azul mb-1">Registrar Pago</h3>
              <p className="text-sm text-gray-500 mb-4 pb-4 border-b">
                {jugadorSeleccionado.apellidos} {jugadorSeleccionado.nombres}
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Monto a cobrar ($)
                  </label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-bold text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Forma de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormaPago('efectivo')}
                      className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-semibold transition-colors ${
                        formaPago === 'efectivo' 
                          ? 'bg-liga-azul text-white border-liga-azul' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <User size={16} /> Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormaPago('transferencia')}
                      className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-semibold transition-colors ${
                        formaPago === 'transferencia' 
                          ? 'bg-liga-azul text-white border-liga-azul' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard size={16} /> Transf.
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setJugadorSeleccionado(null)}
                  disabled={registrando}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarPago}
                  disabled={registrando}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registrando ? 'Guardando...' : (
                    <>
                      <Check size={18} /> Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}