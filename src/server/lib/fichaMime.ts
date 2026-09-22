const EXTENSION_FICHA_POR_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export function normalizarFichaEmpleado(mimeType: string | undefined): { mime: string; extension: string } | null {
  const mime = (mimeType || '').toLowerCase().split(';')[0].trim();
  const extension = EXTENSION_FICHA_POR_MIME[mime];
  if (!extension) return null;
  return { mime: mime === 'image/jpg' ? 'image/jpeg' : mime, extension };
}
