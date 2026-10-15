// ============================================================
// UTILIDADES PARA COMPRIMIR IMÁGENES EN EL NAVEGADOR
// ============================================================

/**
 * Comprime una imagen usando Canvas API
 * @param {File} archivo - Archivo original
 * @param {Object} opciones - Opciones de compresión
 * @returns {Promise<File>} - Archivo comprimido
 */
export async function comprimirImagen(archivo, opciones = {}) {
  const {
    maxAncho = 800,           // Ancho máximo en píxeles
    maxAlto = 800,            // Alto máximo
    calidad = 0.85,           // Calidad JPEG (0-1)
    maxTamanoMB = 5,          // Tamaño máximo antes de comprimir
    maxTamanoFinalMB = 0.5,   // Tamaño objetivo después de comprimir
  } = opciones

  // Validar tamaño antes de comprimir
  const tamanoMB = archivo.size / (1024 * 1024)
  if (tamanoMB > maxTamanoMB) {
    throw new Error(`La imagen es muy grande (${tamanoMB.toFixed(1)} MB). Máximo: ${maxTamanoMB} MB`)
  }

  // Si ya es pequeña y no necesita compresión grande, devolver tal cual
  if (tamanoMB < maxTamanoFinalMB && archivo.type === 'image/jpeg') {
    return archivo
  }

  // Cargar la imagen
  const img = await cargarImagen(archivo)

  // Calcular nuevas dimensiones manteniendo proporción
  let { width, height } = img
  if (width > maxAncho || height > maxAlto) {
    const ratio = Math.min(maxAncho / width, maxAlto / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // Crear canvas y dibujar
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Fondo blanco (para PNG transparentes)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // Dibujar la imagen
  ctx.drawImage(img, 0, 0, width, height)

  // Convertir a JPEG comprimido
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Error al comprimir la imagen'))
          return
        }
        const archivoComprimido = new File(
          [blob],
          archivo.name.replace(/\.[^.]+$/, '.jpg'),
          { type: 'image/jpeg', lastModified: Date.now() }
        )
        resolve(archivoComprimido)
      },
      'image/jpeg',
      calidad
    )
  })
}

/**
 * Carga una imagen desde un archivo
 */
function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Error al leer la imagen'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(archivo)
  })
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validarImagen(archivo, maxTamanoMB = 5) {
  if (!archivo) {
    return { valido: false, error: 'No hay archivo' }
  }

  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png']
  if (!tiposPermitidos.includes(archivo.type)) {
    return {
      valido: false,
      error: 'Formato no permitido. Solo JPG o PNG.',
    }
  }

  const tamanoMB = archivo.size / (1024 * 1024)
  if (tamanoMB > maxTamanoMB) {
    return {
      valido: false,
      error: `La imagen es muy grande (${tamanoMB.toFixed(1)} MB). Máximo: ${maxTamanoMB} MB`,
    }
  }

  return { valido: true }
}