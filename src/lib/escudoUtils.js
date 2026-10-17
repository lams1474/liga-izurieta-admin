// ============================================================
// UTILIDADES PARA SUBIR ESCUDOS DE EQUIPOS
// ============================================================

import { supabase } from './supabase'

const BUCKET = 'escudos-equipos'

/**
 * Sube el escudo de un equipo a Supabase Storage
 * @param {File} archivo - Archivo de imagen (ya comprimido)
 * @param {string} clubId - UUID del club
 * @returns {Promise<string>} - URL pública del escudo
 */
export async function subirEscudo(archivo, clubId) {
  if (!archivo || !clubId) {
    throw new Error('Faltan parámetros: archivo y clubId')
  }

  // Nombre del archivo: {clubId}.png (regla de la política RLS)
  const nombreArchivo = `${clubId}.png`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(nombreArchivo, archivo, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('Error subiendo escudo:', uploadError)
    throw new Error('Error al subir el escudo: ' + uploadError.message)
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(nombreArchivo)

  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública')
  }

  return `${data.publicUrl}?v=${Date.now()}`
}

/**
 * Genera la URL pública del escudo de un equipo
 */
export function obtenerUrlEscudo(clubId) {
  if (!clubId) return null
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${clubId}.png`)
  return data?.publicUrl || null
}