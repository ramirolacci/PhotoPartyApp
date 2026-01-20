// Detectar si es móvil para optimizar mejor
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export async function compressImage(
  blob: Blob,
  maxWidth: number = isMobile ? 1280 : 1920,
  maxHeight: number = isMobile ? 1280 : 1920,
  quality: number = isMobile ? 0.75 : 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (error) => {
        console.error('Image load error in compressImage:', error);
        console.error('Blob type:', blob.type, 'Size:', blob.size);
        // Intentar recuperar si es un problema de carga
        resolve(blob);
      };

      const dataUrl = event.target?.result as string;
      if (!dataUrl || dataUrl.length < 100) {
        console.error('Invalid Data URL generated in compressImage');
        resolve(blob);
        return;
      }
      img.src = dataUrl;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Mantener aspect ratio y redimensionar si es necesario
          const aspectRatio = width / height;

          if (width > height) {
            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }
          } else {
            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Asegurar dimensiones válidas
          width = Math.round(width);
          height = Math.round(height);

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', {
            willReadFrequently: false,
            alpha: false
          });

          if (!ctx) {
            console.warn('Could not get canvas context, returning original blob');
            resolve(blob);
            return;
          }

          // Mejorar calidad de renderizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Limpiar referencia de imagen para liberar memoria
          img.src = '';

          canvas.toBlob(
            (compressedBlob) => {
              // Limpiar canvas
              canvas.width = 0;
              canvas.height = 0;
              resolve(compressedBlob || blob);
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          console.error('Error during image compression:', error);
          resolve(blob);
        }
      };
      img.src = event.target?.result as string;
    };
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      resolve(reader.result as string);
    };
  });
}

export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mimeType });
}

export function getEstimatedSize(base64: string): number {
  const fileSize = base64.length * 0.75;
  return Math.round(fileSize / 1024);
}
