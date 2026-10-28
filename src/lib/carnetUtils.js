import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Descarga un elemento HTML como imagen PNG
 */
export async function descargarComoImagen(elemento, nombreArchivo = 'carnet.png') {
  const canvas = await html2canvas(elemento, {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  })

  const link = document.createElement('a')
  link.download = nombreArchivo
  link.href = canvas.toDataURL('image/png')
  link.click()
}

/**
 * Descarga un elemento HTML como PDF (tamaño carnet real 8.5 x 5.5 cm)
 */
export async function descargarComoPDF(elemento, nombreArchivo = 'carnet.pdf') {
  const canvas = await html2canvas(elemento, {
    scale: 4,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')

  // 8.5 cm x 5.5 cm en milímetros
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85, 55],
  })

  pdf.addImage(imgData, 'PNG', 0, 0, 85, 55)
  pdf.save(nombreArchivo)
}

/**
 * Genera una hoja A4 con múltiples carnets (10 por hoja)
 * Recibe un array de elementos HTML
 */
export async function imprimirCarnetsA4(elementos, nombreArchivo = 'carnets-a4.pdf') {
  // A4: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Medidas
  const carnetAncho = 85
  const carnetAlto = 55
  const margenX = 10
  const margenY = 10
  const espacioX = (210 - 2 * margenX - 2 * carnetAncho) / 3  // 3 espacios entre 2 columnas
  const espacioY = (297 - 2 * margenY - 5 * carnetAlto) / 6     // 6 espacios entre 5 filas

  // 2 columnas x 5 filas = 10 carnets por hoja
  const columnas = 2
  const filas = 5
  const porPagina = columnas * filas

  for (let i = 0; i < elementos.length; i++) {
    const elemento = elementos[i]

    // Si ya llenamos la página, agregar una nueva
    if (i > 0 && i % porPagina === 0) {
      pdf.addPage()
    }

    const posicionEnPagina = i % porPagina
    const col = posicionEnPagina % columnas
    const fila = Math.floor(posicionEnPagina / columnas)

    const x = margenX + col * (carnetAncho + espacioX)
    const y = margenY + fila * (carnetAlto + espacioY)

    const canvas = await html2canvas(elemento, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', x, y, carnetAncho, carnetAlto)
  }

  pdf.save(nombreArchivo)
}