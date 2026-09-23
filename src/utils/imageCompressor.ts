export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0
  targetFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Bájtok formázása emberi fogyasztásra (pl. "245 KB", "1.2 MB")
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * HEIC képek konvertálása Canvas-kompatibilis blobbá
 */
async function handleHeicConversion(file: File): Promise<Blob> {
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.warn('HEIC conversion failed, proceeding with original file', err);
    return file;
  }
}

/**
 * Kép automatikus átméretezése és WebP formátumra tömörítése
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    targetFormat = 'image/webp',
  } = options;

  // Ha nem kép, visszaadjuk az eredetit
  if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) {
    return file;
  }

  try {
    let sourceBlob: Blob = file;

    // HEIC/HEIF kezelése
    if (file.type.includes('heic') || file.type.includes('heif') || file.name.match(/\.(heic|heif)$/i)) {
      sourceBlob = await handleHeicConversion(file);
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(sourceBlob);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          const isAlreadyWebP = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
          // Ha a kép már eleve WebP formátumú és méretei sem haladják meg a korlátot, nem tömörítjük újra
          if (isAlreadyWebP && width <= maxWidth && height <= maxHeight) {
            resolve(file);
            return;
          }

          // Arányos átméretezés: max 1600px
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Ha a WebP nem támogatott valamilyen okból, megpróbáljuk JPEG-gel
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (!fallbackBlob) {
                      resolve(file);
                      return;
                    }
                    const fallbackName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                    resolve(
                      new File([fallbackBlob], fallbackName, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                      })
                    );
                  },
                  'image/jpeg',
                  quality
                );
                return;
              }

              const ext = targetFormat === 'image/webp' ? '.webp' : targetFormat === 'image/png' ? '.png' : '.jpg';
              const newFileName = file.name.replace(/\.[^/.]+$/, '') + ext;
              const compressedFile = new File([blob], newFileName, {
                type: blob.type || targetFormat,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            targetFormat,
            quality
          );
        };

        img.onerror = () => resolve(file);
      };

      reader.onerror = () => resolve(file);
    });
  } catch (error) {
    console.error('Image compression error:', error);
    return file;
  }
}

/**
 * Kép tömörítése Base64 formátumra (Offline / LocalStorage fallback esetére)
 */
export async function compressImageToBase64(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const compressed = await compressImage(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(compressed);
  });
}
