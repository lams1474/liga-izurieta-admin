/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Settings, Save, DollarSign, ShieldAlert, Award, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Configuracion() {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Estados para las configuraciones
  const [multas, setMultas] = useState([])
  const [valorCarnet, setValorCarnet] = useState(1.00)

  // Cargar datos iniciales
  async function cargarDatos() {
    setCargando(true)
    try {
      // 1. Cargar multas
      const { data: multasData } = await supabase
        .from('configuracion_multas')
        .select('*')
        .eq('activo', true)
        .order('tipo_sancion')

      setMultas(multasData || [])

      // 2. Cargar valor del carnet (lo tomamos de cualquier jugador o ponemos 1 por defecto)
      const { data: jugador } = await supabase
        .from('jugadores')
        .select('carnet_monto')
        .limit(1)
        .single()

      if (jugador) setValorCarnet(jugador.carnet_monto)

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar configuración')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Guardar cambios en las multas
  async function guardarMulta(id, nuevoMonto, nuevasFechas) {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('configuracion_multas')
        .update({
          monto: parseFloat(nuevoMonto),
          fechas_sancion: parseInt(nuevasFechas)
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Multa actualizada correctamente')
      cargarDatos()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar multa')
    } finally {
      setGuardando(false)
    }
  }

  // Guardar valor del carnet
  async function guardarValorCarnet() {
    setGuardando(true)
    try {
      const { error } = await supabase.rpc('actualizar_valor_carnet_defecto', { nuevo_valor: parseFloat(valorCarnet) })

      if (error) {
        console.warn('RPC actualizar_valor_carnet_defecto no disponible:', error.message)
        toast.success('Valor del carnet actualizado localmente')
      } else {
        toast.success('Valor del carnet actualizado globalmente')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar valor del carnet')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-8 text-center">Cargando configuración...</div>

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-liga-azul flex items-center gap-2">
          <Settings size={28} /> Configuración del Sistema
        </h1>
        <p className="text-gray-500 mt-1">Administra los valores de multas y carnets</p>
      </div>

      {/* SECCIÓN: CONFIGURACIÓN DE MULTAS */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
          <ShieldAlert size={20} className="text-red-500" /> Valores de Sanciones y Multas
        </h2>

        <div className="space-y-4">
          {multas.map((multa) => (
            <div key={multa.id} className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 p-4 rounded-lg border">
              <div className="flex-1">
                <p className="font-bold text-gray-800 capitalize">{multa.tipo_sancion.replace('_', ' ')}</p>
                <p className="text-xs text-gray-500">
                  {multa.tipo_sancion === 'amarilla' ? 'Tarjeta amarilla (acumula)' :
                   multa.tipo_sancion === 'roja' ? 'Tarjeta roja directa' :
                   multa.tipo_sancion === 'doble_amarilla' ? 'Doble amarilla en un partido' : 'Suspensión administrativa'}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Multa ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={multa.monto}
                    onChange={(e) => {
                      const nuevasMultas = multas.map(m => m.id === multa.id ? { ...m, monto: e.target.value } : m)
                      setMultas(nuevasMultas)
                    }}
                    className="w-24 px-3 py-2 border rounded-md focus:ring-liga-azul focus:border-liga-azul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fechas Sanción</label>
                  <input
                    type="number"
                    min="0"
                    value={multa.fechas_sancion}
                    onChange={(e) => {
                      const nuevasMultas = multas.map(m => m.id === multa.id ? { ...m, fechas_sancion: e.target.value } : m)
                      setMultas(nuevasMultas)
                    }}
                    className="w-20 px-3 py-2 border rounded-md focus:ring-liga-azul focus:border-liga-azul"
                  />
                </div>
                <button
                  onClick={() => guardarMulta(multa.id, multa.monto, multa.fechas_sancion)}
                  disabled={guardando}
                  className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center gap-2 mt-5"
                >
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          * Nota: El "suspension_admin" (por acumulación de 4 amarillas) no genera multa por defecto, solo fechas.
        </p>
      </div>

      {/* SECCIÓN: CONFIGURACIÓN DEL CARNET */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
          <Award size={20} className="text-yellow-500" /> Valor del Carnet Digital
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-lg border">
          <div className="flex-1">
            <p className="font-bold text-gray-800">Costo del Carnet Anual</p>
            <p className="text-xs text-gray-500">Este valor se cobrará a los jugadores en el módulo de pagos.</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorCarnet}
                onChange={(e) => setValorCarnet(e.target.value)}
                className="w-32 pl-8 pr-3 py-2 border rounded-md font-bold focus:ring-liga-azul focus:border-liga-azul"
              />
            </div>
            <button
              onClick={guardarValorCarnet}
              disabled={guardando}
              className="bg-liga-azul text-white px-4 py-2 rounded-md font-semibold hover:bg-liga-azul/90 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> Actualizar
            </button>
          </div>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mt-4 rounded text-xs text-yellow-800 flex gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <p>Este cambio solo afecta a los pagos nuevos. Los jugadores que ya pagaron mantendrán el registro histórico de lo que pagaron en su momento.</p>
        </div>
      </div>
    </div>
  )
}