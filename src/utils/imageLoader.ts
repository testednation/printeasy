import type { SheetImage } from '../types/sheet';

export interface SampleAsset {
  name: string;
  url: string;
  defaultCopies: number;
}

export const SAMPLE_ASSETS: SampleAsset[] = [
  {
    name: 'Eucalyptus Botanical Card.jpg',
    url: '/src/assets/images/sample_botanical_card_1795357321884.jpg',
    defaultCopies: 3,
  },
  {
    name: 'Pour-Over Coffee Sticker.jpg',
    url: '/src/assets/images/sample_coffee_sticker_1795357316644.jpg',
    defaultCopies: 3,
  },
  {
    name: 'Alpine Sunrise Print.jpg',
    url: '/src/assets/images/sample_alpine_photo_1795357315913.jpg',
    defaultCopies: 3,
  },
];

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readDataUrlDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function loadFilesAsSheetImages(
  files: FileList | File[],
  defaultCopies = 1
): Promise<SheetImage[]> {
  const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
  const results: SheetImage[] = [];

  for (const file of fileArray) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const dims = await readDataUrlDimensions(dataUrl);
      results.push({
        id: generateId(),
        name: file.name,
        dataUrl,
        naturalWidth: dims.width,
        naturalHeight: dims.height,
        copies: Math.max(1, defaultCopies),
        rotation: 0,
      });
    } catch {
      // Skip unreadable files without breaking the batch
    }
  }

  return results;
}

export async function loadSampleSheetImages(): Promise<SheetImage[]> {
  const results: SheetImage[] = [];

  for (const sample of SAMPLE_ASSETS) {
    try {
      const response = await fetch(sample.url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed reading sample blob'));
        reader.readAsDataURL(blob);
      });
      const dims = await readDataUrlDimensions(dataUrl);
      results.push({
        id: generateId(),
        name: sample.name,
        dataUrl,
        naturalWidth: dims.width,
        naturalHeight: dims.height,
        copies: sample.defaultCopies,
        rotation: 0,
      });
    } catch {
      // Fallback: load directly via Image element + canvas if fetch is restricted
      try {
        const loaded = await new Promise<SheetImage>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('No 2d context'));
              return;
            }
            ctx.drawImage(img, 0, 0);
            resolve({
              id: generateId(),
              name: sample.name,
              dataUrl: canvas.toDataURL('image/jpeg', 0.94),
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              copies: sample.defaultCopies,
              rotation: 0,
            });
          };
          img.onerror = () => reject(new Error('Sample image failed'));
          img.src = sample.url;
        });
        results.push(loaded);
      } catch {
        // Ignore individual sample failure
      }
    }
  }

  return results;
}
