import { jsPDF } from 'jspdf';
import type { ComputedPage, ImageFilter, LayoutSettings, SheetGeometry, SlotPlacement } from '../types/sheet';

export interface ExportProgress {
  currentPage: number;
  totalPages: number;
  stage: 'preparing' | 'rendering' | 'saving';
  percent: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [113, 113, 122];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [
    Number.isNaN(r) ? 113 : r,
    Number.isNaN(g) ? 113 : g,
    Number.isNaN(b) ? 122 : b,
  ];
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image during PDF export'));
    img.src = src;
  });
}

/**
 * Renders a single image into an offscreen canvas at high print resolution,
 * applying exact rotation and cover/contain/stretch math matching LivePreviewCanvas.
 */
function renderSlotImageToCanvasData(
  imgEl: HTMLImageElement,
  slot: SlotPlacement,
  settings: LayoutSettings
): { dataUrl: string; format: 'JPEG' | 'PNG' } {
  const drawRect = slot.drawRectMm || {
    x: 0,
    y: 0,
    width: slot.widthMm,
    height: slot.heightMm,
  };

  // Exact pixel target based on physical mm size and selected export DPI
  const targetPxW = Math.max(16, Math.round((drawRect.width / 25.4) * settings.dpi));
  const targetPxH = Math.max(16, Math.round((drawRect.height / 25.4) * settings.dpi));

  // Cap individual cell canvas at 3600px on longest side to protect browser RAM while maintaining ultra print clarity
  const maxSide = 3600;
  const scaleCap = Math.min(1, maxSide / Math.max(targetPxW, targetPxH));
  const outW = Math.max(16, Math.round(targetPxW * scaleCap));
  const outH = Math.max(16, Math.round(targetPxH * scaleCap));

  const rot = slot.effectiveRotation;
  const swapped = rot === 90 || rot === 270;

  // Step 1: Produce rotated source canvas if rotated
  let sourceDrawable: HTMLImageElement | HTMLCanvasElement = imgEl;
  let srcW = imgEl.naturalWidth;
  let srcH = imgEl.naturalHeight;

  if (rot !== 0) {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = swapped ? imgEl.naturalHeight : imgEl.naturalWidth;
    rotCanvas.height = swapped ? imgEl.naturalWidth : imgEl.naturalHeight;
    const rCtx = rotCanvas.getContext('2d');
    if (rCtx) {
      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((rot * Math.PI) / 180);
      rCtx.drawImage(imgEl, -imgEl.naturalWidth / 2, -imgEl.naturalHeight / 2);
      sourceDrawable = rotCanvas;
      srcW = rotCanvas.width;
      srcH = rotCanvas.height;
    }
  }

  // Step 2: Render into final high-resolution output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize canvas context for PDF export');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const isPngSource = slot.image?.dataUrl.startsWith('data:image/png');
  if (!isPngSource) {
    ctx.fillStyle = settings.paperColor || '#FFFFFF';
    ctx.fillRect(0, 0, outW, outH);
  }

  if (settings.fitMode === 'cover') {
    const srcAspect = srcW / srcH;
    const dstAspect = outW / outH;
    let cropW = srcW;
    let cropH = srcH;
    let cropX = 0;
    let cropY = 0;

    if (srcAspect > dstAspect) {
      cropW = srcH * dstAspect;
      cropX = (srcW - cropW) / 2;
    } else {
      cropH = srcW / dstAspect;
      cropY = (srcH - cropH) / 2;
    }
    ctx.drawImage(sourceDrawable, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
  } else {
    // Both 'contain' (already aspect-sized via drawRect) and 'stretch' draw full source into outW x outH
    ctx.drawImage(sourceDrawable, 0, 0, srcW, srcH, 0, 0, outW, outH);
  }

  // Step 3: Apply deterministic pixel-level filter (matches CSS grayscale/sepia/invert across all browsers)
  const filter: ImageFilter = slot.image?.filter || 'none';
  if (filter !== 'none') {
    const imgData = ctx.getImageData(0, 0, outW, outH);
    const d = imgData.data;
    if (filter === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
        d[i] = lum;
        d[i + 1] = lum;
        d[i + 2] = lum;
      }
    } else if (filter === 'sepia') {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        d[i] = Math.min(255, Math.round(r * 0.393 + g * 0.769 + b * 0.189));
        d[i + 1] = Math.min(255, Math.round(r * 0.349 + g * 0.686 + b * 0.168));
        d[i + 2] = Math.min(255, Math.round(r * 0.272 + g * 0.534 + b * 0.131));
      }
    } else if (filter === 'invert') {
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  if (isPngSource) {
    return { dataUrl: outCanvas.toDataURL('image/png'), format: 'PNG' };
  }
  return { dataUrl: outCanvas.toDataURL('image/jpeg', 0.96), format: 'JPEG' };
}

/**
 * Draws crisp vector cut marks, dashed cut lines, or thin hairline borders onto the PDF page.
 */
function drawVectorGuides(
  doc: jsPDF,
  slots: SlotPlacement[],
  geometry: SheetGeometry,
  settings: LayoutSettings
): void {
  if (settings.guideStyle === 'none') return;

  const [r, g, b] = hexToRgb(settings.guideColor || '#71717A');
  doc.setDrawColor(r, g, b);

  if (settings.guideStyle === 'solidBorder') {
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([], 0);
    for (const slot of slots) {
      if (!slot.image) continue;
      doc.rect(slot.xMm, slot.yMm, slot.widthMm, slot.heightMm, 'S');
    }
    return;
  }

  if (settings.guideStyle === 'dashedLines') {
    doc.setLineWidth(0.22);
    doc.setLineDashPattern([1.6, 1.4], 0);
    for (const slot of slots) {
      if (!slot.image) continue;
      doc.rect(slot.xMm, slot.yMm, slot.widthMm, slot.heightMm, 'S');
    }
    doc.setLineDashPattern([], 0);
    return;
  }

  if (settings.guideStyle === 'cropMarks') {
    doc.setLineWidth(0.22);
    doc.setLineDashPattern([], 0);
    const tick = Math.min(3.5, Math.max(1.8, Math.min(geometry.marginMm * 0.55, 3.5)));
    const offset = Math.min(0.8, geometry.gapMm > 2 ? 0.6 : 0);

    for (const slot of slots) {
      if (!slot.image) continue;
      const x1 = slot.xMm;
      const y1 = slot.yMm;
      const x2 = slot.xMm + slot.widthMm;
      const y2 = slot.yMm + slot.heightMm;

      // Top-left corner ticks
      doc.line(x1 - offset - tick, y1, x1 - offset, y1);
      doc.line(x1, y1 - offset - tick, x1, y1 - offset);

      // Top-right corner ticks
      doc.line(x2 + offset, y1, x2 + offset + tick, y1);
      doc.line(x2, y1 - offset - tick, x2, y1 - offset);

      // Bottom-left corner ticks
      doc.line(x1 - offset - tick, y2, x1 - offset, y2);
      doc.line(x1, y2 + offset, x1, y2 + offset + tick);

      // Bottom-right corner ticks
      doc.line(x2 + offset, y2, x2 + offset + tick, y2);
      doc.line(x2, y2 + offset, x2, y2 + offset + tick);
    }
  }
}

export async function exportSheetGridToPdf(
  pages: ComputedPage[],
  geometry: SheetGeometry,
  settings: LayoutSettings,
  onProgress?: (progress: ExportProgress) => void
): Promise<{ filename: string; pageCount: number; imageCount: number }> {
  const totalPages = pages.length;

  onProgress?.({
    currentPage: 0,
    totalPages,
    stage: 'preparing',
    percent: 5,
  });

  // Yield briefly so UI renders progress modal smoothly
  await new Promise((r) => setTimeout(r, 40));

  const orientation = geometry.pageWidthMm > geometry.pageHeightMm ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [geometry.pageWidthMm, geometry.pageHeightMm],
    compress: true,
    precision: 3,
  });

  // Cache rendered image payloads & PDF XObject aliases so repeated N-Up images stay tiny & blazing fast
  const decodedHtmlImages = new Map<string, HTMLImageElement>();
  const renderedCache = new Map<string, { dataUrl: string; format: 'JPEG' | 'PNG'; alias: string }>();

  let totalImagesDrawn = 0;

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];
    if (pIdx > 0) {
      doc.addPage([geometry.pageWidthMm, geometry.pageHeightMm], orientation);
    }

    onProgress?.({
      currentPage: pIdx + 1,
      totalPages,
      stage: 'rendering',
      percent: Math.round(10 + ((pIdx + 0.5) / totalPages) * 80),
    });

    // Yield per page to keep UI responsive on large multi-page exports
    await new Promise((r) => setTimeout(r, 16));

    // Fill paper background if non-white
    if (settings.paperColor && settings.paperColor.toLowerCase() !== '#ffffff') {
      const [pr, pg, pb] = hexToRgb(settings.paperColor);
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, geometry.pageWidthMm, geometry.pageHeightMm, 'F');
    }

    for (const slot of page.slots) {
      if (!slot.image || !slot.drawRectMm) continue;

      const filterKey = slot.image.filter || 'none';
      const cacheKey = `${slot.image.id}_${slot.effectiveRotation}_${filterKey}_${settings.fitMode}_${settings.dpi}_${slot.drawRectMm.width.toFixed(2)}x${slot.drawRectMm.height.toFixed(2)}`;
      let cached = renderedCache.get(cacheKey);

      if (!cached) {
        let htmlImg = decodedHtmlImages.get(slot.image.id);
        if (!htmlImg) {
          htmlImg = await loadHtmlImage(slot.image.dataUrl);
          decodedHtmlImages.set(slot.image.id, htmlImg);
        }
        const rendered = renderSlotImageToCanvasData(htmlImg, slot, settings);
        cached = {
          ...rendered,
          alias: `sp_${renderedCache.size + 1}`,
        };
        renderedCache.set(cacheKey, cached);
      }

      doc.addImage(
        cached.dataUrl,
        cached.format,
        slot.xMm + slot.drawRectMm.x,
        slot.yMm + slot.drawRectMm.y,
        slot.drawRectMm.width,
        slot.drawRectMm.height,
        cached.alias,
        'FAST'
      );
      totalImagesDrawn++;
    }

    drawVectorGuides(doc, page.slots, geometry, settings);
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    stage: 'saving',
    percent: 96,
  });

  await new Promise((r) => setTimeout(r, 30));

  const safeBase = (settings.pdfFilename.trim() || 'sheetpress-grid').replace(/[^a-z0-9-_\s]/gi, '').trim() || 'sheetpress-grid';
  const filename = `${safeBase}-${settings.columns}x${settings.rows}-${settings.dpi}dpi.pdf`;
  doc.save(filename);

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    stage: 'saving',
    percent: 100,
  });

  return {
    filename,
    pageCount: totalPages,
    imageCount: totalImagesDrawn,
  };
}
