import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, DollarSign, CheckCircle, CreditCard, User, Check, AlertCircle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pagos() {
  const { usuario } = useAuth()
  
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  // Estados para el pago
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null) // { tipo, id, monto, nombre }
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState('efectivo')
  const [registrando, setRegistrando] = useState(false)

  // Buscar jugadores
  async function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return

    setBuscando(true)
    setBuscado(true)
    setConceptoSeleccionado(null)

    // 1. Buscar jugadores y sus deudas pendientes
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
        ),
        deudas:deudas_jugador (
          id, concepto, monto, monto_pagado
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

  // Registrar el pago (Carnet o Deuda)
  async function registrarPago() {
    if (!conceptoSeleccionado) return
    if (!monto || parseFloat(monto) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setRegistrando(true)
    try {
      if (conceptoSeleccionado.tipo === 'carnet') {
        // Cobrar carnet usando la función RPC
        const { error } = await supabase.rpc('registrar_pago_carnet', {
          p_jugador_id: conceptoSeleccionado.jugador_id,
          p_monto: parseFloat(monto),
          p_forma_pago: formaPago,
          p_referencia: 'Pago presencial',
          p_registrado_por: usuario.id,
          p_observaciones: 'Cobro de carnet digital'
        })
        if (error) throw error
      } else if (conceptoSeleccionado.tipo === 'deuda') {
        // Cobrar deuda (multa) actualizando monto_pagado
        const { error } = await supabase
          .from('deudas_jugador')
          .update({ monto_pagado: parseFloat(monto) })
          .eq('id', conceptoSeleccionado.id)
        if (error) throw error
      }

      toast.success('Pago registrado correctamente')
      
      // Actualizar la vista localmente (recargar la búsqueda)
      buscar({ preventDefault: () => {} })
      setConceptoSeleccionado(null)
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
          Cobra carnets digitales y multas pendientes
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
            
            // Filtrar deudas pendientes
            const deudasPendientes = (jugador.deudas || []).filter(d => d.monto_pagado < d.monto)
            
            return (
              <div 
                key={jugador.id} 
                className="bg-white rounded-lg shadow-md border-l-4 border-liga-azul p-4"
              >
                {/* Info del jugador */}
                <div className="mb-4 pb-3 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {jugador.codigo_interno}
                    </span>
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

                {/* Conceptos a cobrar */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Conceptos pendientes:</p>

                  {/* 1. Carnet Digital */}
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                    <div>
                      <p className="font-semibold text-sm">Carnet Digital {new Date().getFullYear()}</p>
                      {pagadoEsteAno ? (
                        <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-1">
                          <CheckCircle size={14} /> Pagado el {new Date(jugador.carnet_pagado_en).toLocaleDateString('es-EC')}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 font-semibold mt-1">Pendiente ($1.00)</p>
                      )}
                    </div>
                    {!pagadoEsteAno && (
                      <button
                        onClick={() => {
                          setConceptoSeleccionado({ 
                            tipo: 'carnet', 
                            jugador_id: jugador.id, 
                            monto: 1.00,
                            nombre: `Carnet Digital - ${jugador.apellidos}`
                          })
                          setMonto('1.00')
                        }}
                        className="bg-liga-rojo text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-liga-rojo/90"
                      >
                        Cobrar
                      </button>
                    )}
                  </div>

                  {/* 2. Deudas / Multas */}
                  {deudasPendientes.map(deuda => (
                    <div key={deuda.id} className="flex justify-between items-center bg-red-50 border border-red-100 p-3 rounded-md">
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-1 text-red-800">
                          <ShieldAlert size={16} /> {deuda.concepto}
                        </p>
                        <p className="text-xs text-red-600 font-semibold mt-1">
                          Pendiente: ${(deuda.monto - deuda.monto_pagado).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setConceptoSeleccionado({ 
                            tipo: 'deuda', 
                            id: deuda.id, 
                            monto: deuda.monto - deuda.monto_pagado,
                            nombre: deuda.concepto
                          })
                          setMonto((deuda.monto - deuda.monto_pagado).toFixed(2))
                        }}
                        className="bg-liga-rojo text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-liga-rojo/90"
                      >
                        Cobrar
                      </button>
                    </div>
                  ))}

                  {pagadoEsteAno && deudasPendientes.length === 0 && (
                    <p className="text-sm text-green-600 font-semibold text-center py-2">
                      ✓ El jugador no tiene deudas pendientes
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Cobro */}
      {conceptoSeleccionado && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-bold text-liga-azul mb-1">Registrar Pago</h3>
              <p className="text-sm text-gray-500 mb-4 pb-4 border-b">
                {conceptoSeleccionado.nombre}
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
                  onClick={() => setConceptoSeleccionado(null)}
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