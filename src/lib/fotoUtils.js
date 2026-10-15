// ============================================================
// UTILIDADES PARA SUBIR Y ELIMINAR FOTOS DE SUPABASE STORAGE
// ============================================================

import { supabase } from './supabase'

const BUCKET = 'fotos-jugadores'

/**
 * Sube una foto de jugador a Supabase Storage
 * @param {File} archivo - Archivo de imagen (ya comprimido)
 * @param {string} jugadorId - UUID del jugador
 * @returns {Promise<string>} - URL pública de la foto
 */
export async function subirFotoJugador(archivo, jugadorId) {
  if (!archivo || !jugadorId) {
    throw new Error('Faltan parámetros: archivo y jugadorId')
  }

  // Nombre del archivo: {jugador_id}.jpg
  const nombreArchivo = `${jugadorId}.jpg`

  // Subir (con upsert para sobrescribir si existe)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(nombreArchivo, archivo, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    console.error('Error subiendo foto:', uploadError)
    throw new Error('Error al subir la foto: ' + uploadError.message)
  }

  // Obtener URL pública
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(nombreArchivo)

  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública')
  }

  // Agregar timestamp para evitar caché
  return `${data.publicUrl}?v=${Date.now()}`
}

/**
 * Elimina la foto de un jugador de Supabase Storage
 * @param {string} jugadorId - UUID del jugador
 */
export async function eliminarFotoJugador(jugadorId) {
  if (!jugadorId) {
    throw new Error('Falta el jugadorId')
  }

  const nombreArchivo = `${jugadorId}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([nombreArchivo])

  if (error) {
    // Si el archivo no existe, no es un error grave
    if (error.message?.includes('not found') || error.message?.includes('Not Found')) {
      return
    }
    console.error('Error eliminando foto:', error)
    throw new Error('Error al eliminar la foto: ' + error.message)
  }
}

/**
 * Genera la URL pública de la foto de un jugador
 * @param {string} jugadorId - UUID del jugador
 * @returns {string} - URL pública
 */
export function obtenerUrlFoto(jugadorId) {
  if (!jugadorId) return null
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`${jugadorId}.jpg`)
  return data?.publicUrl || null
}