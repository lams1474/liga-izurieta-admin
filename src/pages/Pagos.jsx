/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, DollarSign, CheckCircle, CreditCard, User, Check, AlertCircle, ShieldAlert, Plus, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pagos() {
  const { usuario } = useAuth()
  
  const [vista, setVista] = useState('jugadores') // 'jugadores' | 'equipos'
  
  // === ESTADOS JUGADORES ===
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null)
  
  // === ESTADOS EQUIPOS ===
  const [equipos, setEquipos] = useState([])
  const [deudasEquipos, setDeudasEquipos] = useState([])
  const [cargandoEquipos, setCargandoEquipos] = useState(false)
  const [modalDeudaEq, setModalDeudaEq] = useState(false)
  const [nuevaDeudaEq, setNuevaDeudaEq] = useState({ equipo_id: '', concepto: '', monto: '' })

  // === ESTADOS GENERALES DE COBRO ===
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState('efectivo')
  const [registrando, setRegistrando] = useState(false)

  // ============ CARGA DE DATOS ============
  async function cargarEquiposYDeudas() {
    if (vista !== 'equipos') return
    setCargandoEquipos(true)
    try {
      const { data: eq } = await supabase.from('equipos').select('id, nombre, disciplina, categoria').eq('activo', true).order('nombre')
      setEquipos(eq || [])

      const { data: deudas } = await supabase.from('deudas_equipo').select(`
        id, concepto, monto, monto_pagado, fecha_emision,
        equipo:equipos!deudas_equipo_equipo_id_fkey (id, nombre)
      `).order('creado_en', { ascending: false })
      
      setDeudasEquipos((deudas || []).filter(d => d.monto_pagado < d.monto))
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar equipos')
    } finally {
      setCargandoEquipos(false)
    }
  }

  useEffect(() => {
    if (vista === 'equipos') cargarEquiposYDeudas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  // ============ BÚSQUEDA JUGADORES ============
  async function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return
    setBuscando(true)
    setBuscado(true)
    setConceptoSeleccionado(null)

    const { data, error } = await supabase.from('jugadores').select(`
        id, codigo_interno, apellidos, nombres, cedula, carnet_pagado, carnet_ano, carnet_pagado_en,
        inscripciones:jugador_equipo (activo, equipo:equipos!jugador_equipo_equipo_id_fkey (id, nombre, disciplina, categoria)),
        deudas:deudas_jugador (id, concepto, monto, monto_pagado)
      `)
      .or(`cedula.ilike.%${busqueda.trim()}%,apellidos.ilike.%${busqueda.trim()}%,nombres.ilike.%${busqueda.trim()}%`)
      .eq('activo', true).limit(10)

    if (error) toast.error('Error al buscar')
    else setResultados(data || [])
    setBuscando(false)
  }

  // ============ REGISTRAR PAGO (Carnet o Multa Jugador) ============
  async function registrarPagoJugador() {
    if (!conceptoSeleccionado || !monto || parseFloat(monto) <= 0) return toast.error('Ingresa un monto válido')
    setRegistrando(true)
    try {
      if (conceptoSeleccionado.tipo === 'carnet') {
        await supabase.rpc('registrar_pago_carnet', {
          p_jugador_id: conceptoSeleccionado.jugador_id, p_monto: parseFloat(monto),
          p_forma_pago: formaPago, p_referencia: 'Pago presencial',
          p_registrado_por: usuario.id, p_observaciones: 'Cobro de carnet digital'
        })
      } else if (conceptoSeleccionado.tipo === 'deuda') {
        await supabase.from('deudas_jugador').update({ monto_pagado: parseFloat(monto) }).eq('id', conceptoSeleccionado.id)
      }
      toast.success('Pago registrado correctamente')
      buscar({ preventDefault: () => {} })
      setConceptoSeleccionado(null)
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar pago')
    } finally {
      setRegistrando(false)
    }
  }

  // ============ CREAR DEUDA A EQUIPO ============
  async function crearDeudaEquipo(e) {
    e.preventDefault()
    if (!nuevaDeudaEq.equipo_id || !nuevaDeudaEq.concepto || !nuevaDeudaEq.monto) return toast.error('Llena todos los campos')
    
    setRegistrando(true)
    try {
      const { error } = await supabase.from('deudas_equipo').insert({
        equipo_id: nuevaDeudaEq.equipo_id,
        concepto: nuevaDeudaEq.concepto,
        monto: parseFloat(nuevaDeudaEq.monto),
        monto_pagado: 0,
        registrado_por: usuario.id
      })
      if (error) throw error
      
      toast.success('Deuda registrada al equipo')
      setModalDeudaEq(false)
      setNuevaDeudaEq({ equipo_id: '', concepto: '', monto: '' })
      cargarEquiposYDeudas()
    } catch (err) {
      console.error(err)
      toast.error('Error al crear deuda')
    } finally {
      setRegistrando(false)
    }
  }

  // ============ PAGAR DEUDA DE EQUIPO ============
  async function pagarDeudaEquipo(id, montoTotal) {
    if (!window.confirm(`¿Confirmas el pago total de $${montoTotal.toFixed(2)}?`)) return
    setRegistrando(true)
    try {
      const { error } = await supabase.from('deudas_equipo').update({ monto_pagado: montoTotal }).eq('id', id)
      if (error) throw error
      
      toast.success('Pago de equipo registrado')
      cargarEquiposYDeudas()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar pago')
    } finally {
      setRegistrando(false)
    }
  }

  const obtenerEquipoJugador = (jugador) => jugador.inscripciones?.find(i => i.activo)?.equipo

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header y Pestañas */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-liga-azul">Registro de Pagos</h1>
          <p className="text-gray-500 text-sm mt-1">Cobra carnets, multas de jugadores y cuotas de equipos</p>
        </div>
        <div className="flex bg-white rounded-lg shadow-sm p-1 w-full sm:w-auto">
          <button onClick={() => setVista('jugadores')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${vista === 'jugadores' ? 'bg-liga-azul text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <User size={16} /> Jugadores
          </button>
          <button onClick={() => setVista('equipos')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${vista === 'equipos' ? 'bg-liga-azul text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Shield size={16} /> Equipos
          </button>
        </div>
      </div>

      {/* ================= VISTA JUGADORES ================= */}
      {vista === 'jugadores' && (
        <>
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <form onSubmit={buscar} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por cédula, apellidos o nombres..." className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul" />
              </div>
              <button type="submit" disabled={buscando || !busqueda.trim()} className="bg-liga-azul text-white px-6 py-3 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50">Buscar</button>
            </form>
          </div>

          {buscado && !buscando && resultados.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <AlertCircle size={40} className="mx-auto text-gray-300 mb-2" /> No se encontraron jugadores con ese criterio.
            </div>
          )}

          {resultados.length > 0 && (
            <div className="space-y-4">
              {resultados.map((jugador) => {
                const equipo = obtenerEquipoJugador(jugador)
                const pagadoEsteAno = jugador.carnet_pagado && jugador.carnet_ano === new Date().getFullYear()
                const deudasPendientes = (jugador.deudas || []).filter(d => d.monto_pagado < d.monto)

                return (
                  <div key={jugador.id} className="bg-white rounded-lg shadow-md border-l-4 border-liga-azul p-4">
                    <div className="mb-4 pb-3 border-b">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{jugador.codigo_interno}</span>
                      <h4 className="font-bold text-gray-800 text-lg mt-1">{jugador.apellidos} {jugador.nombres}</h4>
                      <p className="text-sm text-gray-600">C.C. {jugador.cedula}</p>
                      {equipo && <p className="text-xs text-gray-500 mt-1">🏟️ {equipo.nombre} ({equipo.disciplina} · {equipo.categoria})</p>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Conceptos pendientes:</p>
                      
                      {/* Carnet */}
                      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                        <div>
                          <p className="font-semibold text-sm">Carnet Digital {new Date().getFullYear()}</p>
                          {pagadoEsteAno ? <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-1"><CheckCircle size={14} /> Pagado el {new Date(jugador.carnet_pagado_en).toLocaleDateString('es-EC')}</p> : <p className="text-xs text-red-600 font-semibold mt-1">Pendiente ($1.00)</p>}
                        </div>
                        {!pagadoEsteAno && <button onClick={() => { setConceptoSeleccionado({ tipo: 'carnet', jugador_id: jugador.id, monto: 1.00, nombre: `Carnet Digital - ${jugador.apellidos}` }); setMonto('1.00') }} className="bg-liga-rojo text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-liga-rojo/90">Cobrar</button>}
                      </div>

                      {/* Deudas */}
                      {deudasPendientes.map(deuda => (
                        <div key={deuda.id} className="flex justify-between items-center bg-red-50 border border-red-100 p-3 rounded-md">
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-1 text-red-800"><ShieldAlert size={16} /> {deuda.concepto}</p>
                            <p className="text-xs text-red-600 font-semibold mt-1">Pendiente: ${(deuda.monto - deuda.monto_pagado).toFixed(2)}</p>
                          </div>
                          <button onClick={() => { setConceptoSeleccionado({ tipo: 'deuda', id: deuda.id, monto: deuda.monto - deuda.monto_pagado, nombre: deuda.concepto }); setMonto((deuda.monto - deuda.monto_pagado).toFixed(2)) }} className="bg-liga-rojo text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-liga-rojo/90">Cobrar</button>
                        </div>
                      ))}
                      
                      {pagadoEsteAno && deudasPendientes.length === 0 && <p className="text-sm text-green-600 font-semibold text-center py-2">✓ Sin deudas pendientes</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ================= VISTA EQUIPOS ================= */}
      {vista === 'equipos' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setModalDeudaEq(true)} className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 flex items-center gap-2">
              <Plus size={18} /> Nueva Deuda a Equipo
            </button>
          </div>

          {cargandoEquipos ? (
            <div className="text-center py-12 text-gray-500">Cargando deudas de equipos...</div>
          ) : deudasEquipos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              <Shield size={48} className="mx-auto text-gray-300 mb-2" />
              No hay deudas pendientes para ningún equipo.
            </div>
          ) : (
            <div className="space-y-3">
              {deudasEquipos.map(deuda => (
                <div key={deuda.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-l-4 border-red-500">
                  <div>
                    <p className="font-bold text-gray-800">{deuda.equipo?.nombre}</p>
                    <p className="text-sm font-semibold text-red-600 mt-1">{deuda.concepto}</p>
                    <p className="text-xs text-gray-500 mt-1">Emitido: {new Date(deuda.fecha_emision).toLocaleDateString('es-EC')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Monto a pagar</p>
                      <p className="text-xl font-bold text-liga-rojo">${(deuda.monto - deuda.monto_pagado).toFixed(2)}</p>
                    </div>
                    <button onClick={() => pagarDeudaEquipo(deuda.id, deuda.monto)} disabled={registrando} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50">
                      Registrar Pago
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= MODAL COBRO JUGADOR ================= */}
      {conceptoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-liga-azul mb-1">Registrar Pago</h3>
            <p className="text-sm text-gray-500 mb-4 pb-4 border-b">{conceptoSeleccionado.nombre}</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto a cobrar ($)</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-liga-azul font-bold text-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Forma de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormaPago('efectivo')} className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-semibold transition-colors ${formaPago === 'efectivo' ? 'bg-liga-azul text-white border-liga-azul' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}><User size={16} /> Efectivo</button>
                  <button type="button" onClick={() => setFormaPago('transferencia')} className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-semibold transition-colors ${formaPago === 'transferencia' ? 'bg-liga-azul text-white border-liga-azul' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}><CreditCard size={16} /> Transf.</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConceptoSeleccionado(null)} disabled={registrando} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={registrarPagoJugador} disabled={registrando} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {registrando ? 'Guardando...' : <><Check size={18} /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL NUEVA DEUDA EQUIPO ================= */}
      {modalDeudaEq && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={crearDeudaEquipo} className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-liga-azul mb-4">Registrar Deuda a Equipo</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Equipo</label>
                <select required value={nuevaDeudaEq.equipo_id} onChange={e => setNuevaDeudaEq({...nuevaDeudaEq, equipo_id: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="">Seleccione un equipo...</option>
                  {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.disciplina} · {eq.categoria})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Concepto</label>
                <input required type="text" placeholder="Ej: Inscripción 2026" value={nuevaDeudaEq.concepto} onChange={e => setNuevaDeudaEq({...nuevaDeudaEq, concepto: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto ($)</label>
                <input required type="number" step="0.01" min="0.01" placeholder="Ej: 50.00" value={nuevaDeudaEq.monto} onChange={e => setNuevaDeudaEq({...nuevaDeudaEq, monto: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalDeudaEq(false)} disabled={registrando} className="flex-1 py-2 border rounded font-semibold text-gray-700">Cancelar</button>
              <button type="submit" disabled={registrando} className="flex-1 bg-liga-azul text-white py-2 rounded font-semibold disabled:opacity-50">
                {registrando ? 'Guardando...' : 'Registrar Deuda'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}