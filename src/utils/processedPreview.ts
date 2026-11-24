import { useEffect, useState } from 'react';
import type { ImageCrop } from '../types/sheet';

const processedPreviewCache = new Map<string, string>();

export function isFullCrop(crop?: ImageCrop): boolean {
  if (!crop) return true;
  return (
    crop.x <= 0.002 &&
    crop.y <= 0.002 &&
    crop.width >= 0.996 &&
    crop.height >= 0.996
  );
}

/**
 * Produces a cached cropped and/or rotated preview data URL for WYSIWYG rendering
 * in both the Live Preview Canvas and Sidebar photo thumbnails.
 */
export function useProcessedPreviewUrl(
  dataUrl: string,
  rotation: 0 | 90 | 180 | 270,
  crop?: ImageCrop
): string {
  const noTransform = rotation === 0 && isFullCrop(crop);
  const cropSig = crop
    ? `${crop.x.toFixed(4)}_${crop.y.toFixed(4)}_${crop.width.toFixed(4)}_${crop.height.toFixed(4)}`
    : 'full';
  const cacheKey = `${dataUrl.slice(0, 64)}_${dataUrl.length}_${rotation}_${cropSig}`;

  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (noTransform) return dataUrl;
    return processedPreviewCache.get(cacheKey) || dataUrl;
  });

  useEffect(() => {
    if (noTransform) {
      setResolvedUrl(dataUrl);
      return;
    }

    const existing = processedPreviewCache.get(cacheKey);
    if (existing) {
      setResolvedUrl(existing);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      const natW = Math.max(1, img.naturalWidth);
      const natH = Math.max(1, img.naturalHeight);

      const sx = crop ? Math.max(0, Math.min(natW - 1, crop.x * natW)) : 0;
      const sy = crop ? Math.max(0, Math.min(natH - 1, crop.y * natH)) : 0;
      const sw = crop ? Math.max(1, Math.min(natW - sx, crop.width * natW)) : natW;
      const sh = crop ? Math.max(1, Math.min(natH - sy, crop.height * natH)) : natH;

      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const drawW = Math.max(1, Math.round(sw * scale));
      const drawH = Math.max(1, Math.round(sh * scale));
      const swapped = rotation === 90 || rotation === 270;

      const canvas = document.createElement('canvas');
      canvas.width = swapped ? drawH : drawW;
      canvas.height = swapped ? drawW : drawH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);

      const out = canvas.toDataURL('image/png');
      if (processedPreviewCache.size > 80) {
        const firstKey = processedPreviewCache.keys().next().value;
        if (firstKey) processedPreviewCache.delete(firstKey);
      }
      processedPreviewCache.set(cacheKey, out);
      if (!cancelled) setResolvedUrl(out);
    };
    img.src = dataUrl;

    return () => {
      cancelled = true;
    };
  }, [cacheKey, crop, dataUrl, noTransform, rotation]);

  return resolvedUrl;
}
