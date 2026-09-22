import { PDFDocument } from 'pdf-lib';
import { mimeFichaEmpleado } from './fichaMime';

// pdf-lib sabe incrustar JPG y PNG de forma nativa. WEBP no esta soportado,
// asi que hay que rasterizarlo a PNG via canvas antes de combinarlo. HEIC no
// se puede combinar: los navegadores (salvo Safari) no lo pueden decodificar
// en un canvas, asi que directamente no ofrecemos combinarlo.
export function esCombinable(file: File): boolean {
  const mime = mimeFichaEmpleado(file);
  return mime === 'application/pdf' || mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
}

async function webpAPngBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el canvas para combinar imagenes');
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(`No se pudo convertir "${file.name}" a PNG`);
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Combina varios archivos (PDF, JPG, PNG, WEBP) en un solo PDF, una pagina
 * por archivo y en el orden recibido -- pensado para cuando la ficha de un
 * empleado viene repartida en varias fotos (ej. frente y dorso de un
 * documento) o mezclando fotos con un PDF ya escaneado.
 */
export async function combinarArchivosEnPDF(files: File[], nombreSalida: string): Promise<File> {
  const combinado = await PDFDocument.create();

  for (const file of files) {
    const mime = mimeFichaEmpleado(file);
    if (mime === 'application/pdf') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const origen = await PDFDocument.load(bytes);
      const paginas = await combinado.copyPages(origen, origen.getPageIndices());
      paginas.forEach((pagina) => combinado.addPage(pagina));
      continue;
    }

    if (mime === 'image/jpeg' || mime === 'image/png') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const imagen = mime === 'image/jpeg' ? await combinado.embedJpg(bytes) : await combinado.embedPng(bytes);
      const pagina = combinado.addPage([imagen.width, imagen.height]);
      pagina.drawImage(imagen, { x: 0, y: 0, width: imagen.width, height: imagen.height });
      continue;
    }

    if (mime === 'image/webp') {
      const pngBytes = await webpAPngBytes(file);
      const imagen = await combinado.embedPng(pngBytes);
      const pagina = combinado.addPage([imagen.width, imagen.height]);
      pagina.drawImage(imagen, { x: 0, y: 0, width: imagen.width, height: imagen.height });
      continue;
    }

    throw new Error(`"${file.name}" no se puede combinar (formato no admitido para combinar).`);
  }

  const bytes = await combinado.save();
  return new File([bytes as BlobPart], nombreSalida, { type: 'application/pdf' });
}
