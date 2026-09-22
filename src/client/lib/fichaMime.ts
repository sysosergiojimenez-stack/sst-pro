const MIME_POR_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MIME_PERMITIDOS = new Set(Object.values(MIME_POR_EXTENSION));

export const ACCEPT_FICHA_EMPLEADO =
  '.pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

export function mimeFichaEmpleado(file: File): string | null {
  const raw = (file.type || '').toLowerCase().split(';')[0].trim();
  const desdeTipo = raw === 'image/jpg' ? 'image/jpeg' : raw;
  if (MIME_PERMITIDOS.has(desdeTipo)) return desdeTipo;

  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_POR_EXTENSION[extension] || null;
}
