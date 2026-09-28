// Comprime una foto de acta en el navegador antes de subirla: en locales con
// señal débil, una foto de camara sin comprimir (8-15MB) puede tardar minutos
// o fallar directamente. Reducimos a un JPEG de ancho máximo razonable.
const MAX_DIMENSION = 1800;
const JPEG_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await loadImage(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // no vale la pena si no reduce

    const nombre = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nombre, { type: 'image/jpeg' });
  } catch {
    return file; // ante cualquier fallo, subimos el archivo original sin comprimir
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
