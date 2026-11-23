import type {
  ComputedPage,
  FitMode,
  GridPreset,
  GridSuggestion,
  ImageFilter,
  LayoutSettings,
  Orientation,
  PaperDefinition,
  PaperSizeKey,
  SheetGeometry,
  SheetImage,
  SlotPlacement,
  UnitSystem,
} from '../types/sheet';

export const PAPER_DEFINITIONS: Record<PaperSizeKey, PaperDefinition> = {
  a4: {
    key: 'a4',
    label: 'A4',
    widthMm: 210,
    heightMm: 297,
    subtitle: '210 × 297 mm',
  },
  letter: {
    key: 'letter',
    label: 'US Letter',
    widthMm: 215.9,
    heightMm: 279.4,
    subtitle: '8.5 × 11 in',
  },
  a3: {
    key: 'a3',
    label: 'A3',
    widthMm: 297,
    heightMm: 420,
    subtitle: '297 × 420 mm',
  },
  a5: {
    key: 'a5',
    label: 'A5',
    widthMm: 148,
    heightMm: 210,
    subtitle: '148 × 210 mm',
  },
  legal: {
    key: 'legal',
    label: 'US Legal',
    widthMm: 215.9,
    heightMm: 355.6,
    subtitle: '8.5 × 14 in',
  },
  photo4x6: {
    key: 'photo4x6',
    label: '4×6 Photo',
    widthMm: 101.6,
    heightMm: 152.4,
    subtitle: '4 × 6 in',
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    widthMm: 210,
    heightMm: 297,
    subtitle: 'Custom size',
  },
};

export const GRID_PRESETS: GridPreset[] = [
  {
    id: '2x2',
    name: '2×2 Cards',
    description: '4 per page · Postcards & flyers',
    columns: 2,
    rows: 2,
    marginMm: 10,
    gapMm: 6,
    fitMode: 'cover',
    guideStyle: 'cropMarks',
  },
  {
    id: '3x3',
    name: '3×3 Stickers',
    description: '9 per page · Square prints & decals',
    columns: 3,
    rows: 3,
    marginMm: 10,
    gapMm: 5,
    fitMode: 'contain',
    guideStyle: 'dashedLines',
  },
  {
    id: '2x4',
    name: '2×4 Wallet / ID',
    description: '8 per page · Passport & wallet photos',
    columns: 2,
    rows: 4,
    marginMm: 10,
    gapMm: 4,
    fitMode: 'cover',
    guideStyle: 'cropMarks',
  },
  {
    id: '2x5',
    name: '2×5 Business',
    description: '10 per page · Standard cards & tags',
    columns: 2,
    rows: 5,
    marginMm: 10,
    gapMm: 3,
    fitMode: 'cover',
    guideStyle: 'cropMarks',
  },
  {
    id: '4x5',
    name: '4×5 Contact',
    description: '20 per page · Proof sheets & mini labels',
    columns: 4,
    rows: 5,
    marginMm: 8,
    gapMm: 4,
    fitMode: 'contain',
    guideStyle: 'solidBorder',
  },
  {
    id: '4x8',
    name: '4×8 Mini Grid',
    description: '32 per page · Dense stamps & badges',
    columns: 4,
    rows: 8,
    marginMm: 8,
    gapMm: 3,
    fitMode: 'contain',
    guideStyle: 'dashedLines',
  },
];

export const DEFAULT_SETTINGS: LayoutSettings = {
  paperSize: 'a4',
  customWidthMm: 210,
  customHeightMm: 297,
  orientation: 'portrait',
  columns: 3,
  rows: 3,
  marginMm: 10,
  gapMm: 5,
  fitMode: 'cover',
  autoRotate: false,
  guideStyle: 'cropMarks',
  guideColor: '#71717A',
  paperColor: '#FFFFFF',
  dpi: 300,
  unit: 'mm',
  repeatBehavior: 'perImage',
  showRulers: true,
  showResolutionOverlay: false,
  beginnerMode: true,
  pdfFilename: 'sheetpress-grid',
};

export const IMAGE_FILTER_OPTIONS: { key: ImageFilter; label: string }[] = [
  { key: 'none', label: 'Original' },
  { key: 'grayscale', label: 'Grayscale' },
  { key: 'sepia', label: 'Sepia' },
  { key: 'invert', label: 'Invert' },
];

export function getImageCssFilter(filter?: ImageFilter): string {
  switch (filter) {
    case 'grayscale':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(100%)';
    case 'invert':
      return 'invert(100%)';
    default:
      return 'none';
  }
}

export function mmToUnit(mm: number, unit: UnitSystem): number {
  return unit === 'in' ? mm / 25.4 : mm;
}

export function formatLength(mm: number, unit: UnitSystem): string {
  if (unit === 'in') {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

export function formatDimensions(wMm: number, hMm: number, unit: UnitSystem): string {
  if (unit === 'in') {
    return `${(wMm / 25.4).toFixed(2)} × ${(hMm / 25.4).toFixed(2)} in`;
  }
  return `${wMm.toFixed(1)} × ${hMm.toFixed(1)} mm`;
}

/**
 * Computes exact physical sheet geometry in millimeters and target export pixels.
 * Shared identically by the live preview canvas and the high-res PDF exporter.
 */
export function computeSheetGeometry(settings: LayoutSettings): SheetGeometry {
  const baseDef = PAPER_DEFINITIONS[settings.paperSize] || PAPER_DEFINITIONS.a4;
  const rawW = settings.paperSize === 'custom' ? Math.max(40, settings.customWidthMm) : baseDef.widthMm;
  const rawH = settings.paperSize === 'custom' ? Math.max(40, settings.customHeightMm) : baseDef.heightMm;

  const isLandscape = settings.orientation === 'landscape';
  const pageWidthMm = isLandscape ? Math.max(rawW, rawH) : Math.min(rawW, rawH);
  const pageHeightMm = isLandscape ? Math.min(rawW, rawH) : Math.max(rawW, rawH);

  const columns = Math.max(1, Math.min(12, Math.round(settings.columns)));
  const rows = Math.max(1, Math.min(16, Math.round(settings.rows)));

  // Clamp margin and gap safely so cells always stay positive
  const maxMargin = Math.min(pageWidthMm, pageHeightMm) * 0.35;
  const marginMm = Math.max(0, Math.min(settings.marginMm, maxMargin));

  const printableWidthMm = Math.max(10, pageWidthMm - marginMm * 2);
  const printableHeightMm = Math.max(10, pageHeightMm - marginMm * 2);

  const maxGapX = columns > 1 ? (printableWidthMm * 0.6) / (columns - 1) : 30;
  const maxGapY = rows > 1 ? (printableHeightMm * 0.6) / (rows - 1) : 30;
  const gapMm = Math.max(0, Math.min(settings.gapMm, maxGapX, maxGapY));

  const cellWidthMm = (printableWidthMm - gapMm * (columns - 1)) / columns;
  const cellHeightMm = (printableHeightMm - gapMm * (rows - 1)) / rows;

  const targetCellPxW = Math.max(1, Math.round((cellWidthMm / 25.4) * settings.dpi));
  const targetCellPxH = Math.max(1, Math.round((cellHeightMm / 25.4) * settings.dpi));
  const targetPagePxW = Math.max(1, Math.round((pageWidthMm / 25.4) * settings.dpi));
  const targetPagePxH = Math.max(1, Math.round((pageHeightMm / 25.4) * settings.dpi));

  return {
    pageWidthMm,
    pageHeightMm,
    printableWidthMm,
    printableHeightMm,
    marginMm,
    gapMm,
    columns,
    rows,
    slotsPerPage: columns * rows,
    cellWidthMm,
    cellHeightMm,
    targetCellPxW,
    targetCellPxH,
    targetPagePxW,
    targetPagePxH,
  };
}

/**
 * Determines final rotation (0/90/180/270) taking manual rotation + optional auto-rotate into account.
 */
export function resolveEffectiveRotation(
  image: SheetImage,
  cellWidthMm: number,
  cellHeightMm: number,
  autoRotate: boolean
): 0 | 90 | 180 | 270 {
  let rot = image.rotation;
  if (!autoRotate) return rot;

  const isSwapped = rot === 90 || rot === 270;
  const currentW = isSwapped ? image.naturalHeight : image.naturalWidth;
  const currentH = isSwapped ? image.naturalWidth : image.naturalHeight;

  const imageIsLandscape = currentW > currentH * 1.05;
  const imageIsPortrait = currentH > currentW * 1.05;
  const cellIsLandscape = cellWidthMm > cellHeightMm * 1.05;
  const cellIsPortrait = cellHeightMm > cellWidthMm * 1.05;

  if ((imageIsLandscape && cellIsPortrait) || (imageIsPortrait && cellIsLandscape)) {
    rot = (((rot + 90) % 360) as 0 | 90 | 180 | 270);
  }
  return rot;
}

/**
 * Computes exact draw rectangle (mm relative to cell origin) and effective source DPI.
 */
export function computeSlotImageMetrics(
  image: SheetImage,
  cellWidthMm: number,
  cellHeightMm: number,
  fitMode: FitMode,
  effectiveRotation: 0 | 90 | 180 | 270,
  targetDpi: number
): {
  drawRectMm: { x: number; y: number; width: number; height: number };
  effectiveDpi: number;
  isLowRes: boolean;
} {
  const swapped = effectiveRotation === 90 || effectiveRotation === 270;
  const srcW = Math.max(1, swapped ? image.naturalHeight : image.naturalWidth);
  const srcH = Math.max(1, swapped ? image.naturalWidth : image.naturalHeight);
  const srcAspect = srcW / srcH;
  const cellAspect = cellWidthMm / cellHeightMm;

  let drawW = cellWidthMm;
  let drawH = cellHeightMm;
  let drawX = 0;
  let drawY = 0;
  let effectiveDpi = targetDpi;

  if (fitMode === 'stretch') {
    drawW = cellWidthMm;
    drawH = cellHeightMm;
    const dpiX = srcW / (cellWidthMm / 25.4);
    const dpiY = srcH / (cellHeightMm / 25.4);
    effectiveDpi = Math.round(Math.min(dpiX, dpiY));
  } else if (fitMode === 'contain') {
    if (srcAspect > cellAspect) {
      drawW = cellWidthMm;
      drawH = cellWidthMm / srcAspect;
      drawY = (cellHeightMm - drawH) / 2;
    } else {
      drawH = cellHeightMm;
      drawW = cellHeightMm * srcAspect;
      drawX = (cellWidthMm - drawW) / 2;
    }
    effectiveDpi = Math.round(srcW / (drawW / 25.4));
  } else {
    // cover: fills entire cell, crops overflow symmetrically
    drawW = cellWidthMm;
    drawH = cellHeightMm;
    if (srcAspect > cellAspect) {
      // image is wider than cell -> vertical matches, horizontal cropped
      const visibleSrcW = srcH * cellAspect;
      effectiveDpi = Math.round(visibleSrcW / (cellWidthMm / 25.4));
    } else {
      // image is taller than cell -> horizontal matches, vertical cropped
      const visibleSrcH = srcW / cellAspect;
      effectiveDpi = Math.round(visibleSrcH / (cellHeightMm / 25.4));
    }
  }

  // Flag as low-res if below 65% of target DPI (e.g. < 195 DPI when exporting at 300 DPI)
  const isLowRes = effectiveDpi < Math.round(targetDpi * 0.65);

  return {
    drawRectMm: { x: drawX, y: drawY, width: drawW, height: drawH },
    effectiveDpi,
    isLowRes,
  };
}

/**
 * Expands the image queue into exact paginated sheet placements.
 */
export function computePages(
  images: SheetImage[],
  settings: LayoutSettings,
  geometry: SheetGeometry
): ComputedPage[] {
  interface ExpandedItem {
    image: SheetImage;
    imageQueueIndex: number;
    copyNumber: number;
  }

  const expanded: ExpandedItem[] = [];

  if (images.length > 0) {
    if (settings.repeatBehavior === 'fillPage') {
      // Fill at least 1 complete page by cycling through uploaded images evenly
      const totalNeeded =
        images.length <= geometry.slotsPerPage
          ? geometry.slotsPerPage
          : Math.ceil(images.length / geometry.slotsPerPage) * geometry.slotsPerPage;
      const copyCounts = new Map<string, number>();
      for (let i = 0; i < totalNeeded; i++) {
        const qIdx = i % images.length;
        const img = images[qIdx];
        const nextCopy = (copyCounts.get(img.id) || 0) + 1;
        copyCounts.set(img.id, nextCopy);
        expanded.push({
          image: img,
          imageQueueIndex: qIdx,
          copyNumber: nextCopy,
        });
      }
    } else {
      images.forEach((img, qIdx) => {
        const count = Math.max(1, Math.min(200, Math.round(img.copies)));
        for (let c = 1; c <= count; c++) {
          expanded.push({
            image: img,
            imageQueueIndex: qIdx,
            copyNumber: c,
          });
        }
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(expanded.length / geometry.slotsPerPage));
  const pages: ComputedPage[] = [];

  for (let p = 0; p < totalPages; p++) {
    const slots: SlotPlacement[] = [];
    let filledCount = 0;

    for (let s = 0; s < geometry.slotsPerPage; s++) {
      const globalIndex = p * geometry.slotsPerPage + s;
      const row = Math.floor(s / geometry.columns);
      const col = s % geometry.columns;
      const xMm = geometry.marginMm + col * (geometry.cellWidthMm + geometry.gapMm);
      const yMm = geometry.marginMm + row * (geometry.cellHeightMm + geometry.gapMm);

      const entry = expanded[globalIndex] || null;
      if (entry) {
        filledCount++;
        const effectiveRotation = resolveEffectiveRotation(
          entry.image,
          geometry.cellWidthMm,
          geometry.cellHeightMm,
          settings.autoRotate
        );
        const metrics = computeSlotImageMetrics(
          entry.image,
          geometry.cellWidthMm,
          geometry.cellHeightMm,
          settings.fitMode,
          effectiveRotation,
          settings.dpi
        );
        slots.push({
          slotIndex: s,
          globalIndex,
          row,
          col,
          xMm,
          yMm,
          widthMm: geometry.cellWidthMm,
          heightMm: geometry.cellHeightMm,
          image: entry.image,
          imageQueueIndex: entry.imageQueueIndex,
          copyNumber: entry.copyNumber,
          effectiveRotation,
          effectiveDpi: metrics.effectiveDpi,
          isLowRes: metrics.isLowRes,
          drawRectMm: metrics.drawRectMm,
        });
      } else {
        slots.push({
          slotIndex: s,
          globalIndex,
          row,
          col,
          xMm,
          yMm,
          widthMm: geometry.cellWidthMm,
          heightMm: geometry.cellHeightMm,
          image: null,
          imageQueueIndex: -1,
          copyNumber: 0,
          effectiveRotation: 0,
          effectiveDpi: null,
          isLowRes: false,
          drawRectMm: null,
        });
      }
    }

    pages.push({
      pageIndex: p,
      slots,
      filledCount,
    });
  }

  return pages;
}

function describeAspectRatio(avgAspect: number): string {
  if (avgAspect > 1.22) return 'landscape';
  if (avgAspect < 0.82) return 'portrait';
  return 'square';
}

function evaluateGridCandidate(
  images: SheetImage[],
  settings: LayoutSettings,
  columns: number,
  rows: number,
  orientation: Orientation
): { efficiency: number; pagesNeeded: number; emptySlots: number } {
  const candidateSettings: LayoutSettings = {
    ...settings,
    columns,
    rows,
    orientation,
  };
  const geom = computeSheetGeometry(candidateSettings);
  const cellAspect = geom.cellWidthMm / geom.cellHeightMm;
  const cellArea = geom.cellWidthMm * geom.cellHeightMm;
  const printableArea = geom.printableWidthMm * geom.printableHeightMm;

  // Build effective slot list matching repeatBehavior
  const slotImages: SheetImage[] = [];
  if (settings.repeatBehavior === 'fillPage') {
    const totalNeeded =
      images.length <= geom.slotsPerPage
        ? geom.slotsPerPage
        : Math.ceil(images.length / geom.slotsPerPage) * geom.slotsPerPage;
    for (let i = 0; i < totalNeeded; i++) {
      slotImages.push(images[i % images.length]);
    }
  } else {
    for (const img of images) {
      const copies = Math.max(1, Math.min(200, Math.round(img.copies)));
      for (let c = 0; c < copies; c++) {
        slotImages.push(img);
      }
    }
  }

  const pagesNeeded = Math.max(1, Math.ceil(slotImages.length / geom.slotsPerPage));
  const totalSlots = pagesNeeded * geom.slotsPerPage;
  const emptySlots = Math.max(0, totalSlots - slotImages.length);

  let effectiveAreaSum = 0;
  for (const img of slotImages) {
    const effRot = resolveEffectiveRotation(img, geom.cellWidthMm, geom.cellHeightMm, settings.autoRotate);
    const swapped = effRot === 90 || effRot === 270;
    const w = Math.max(1, swapped ? img.naturalHeight : img.naturalWidth);
    const h = Math.max(1, swapped ? img.naturalWidth : img.naturalHeight);
    const imgAspect = w / h;
    // Exact area utilization ratio (1.0 when image aspect matches cell aspect perfectly)
    const aspectFit = Math.min(imgAspect / cellAspect, cellAspect / imgAspect);
    effectiveAreaSum += cellArea * aspectFit;
  }

  const totalPrintableArea = Math.max(1, pagesNeeded * printableArea);
  const efficiency = Math.min(1, effectiveAreaSum / totalPrintableArea);

  return { efficiency, pagesNeeded, emptySlots };
}

/**
 * Analyzes aspect ratios and counts of all loaded images to suggest the most space-efficient
 * grid columns, rows, and paper orientation.
 */
export function analyzeOptimalGrid(
  images: SheetImage[],
  settings: LayoutSettings
): GridSuggestion | null {
  if (images.length === 0) return null;

  // Weighted average aspect ratio across loaded images
  let aspectWeightSum = 0;
  let totalWeight = 0;
  for (const img of images) {
    const swapped = img.rotation === 90 || img.rotation === 270;
    const w = Math.max(1, swapped ? img.naturalHeight : img.naturalWidth);
    const h = Math.max(1, swapped ? img.naturalWidth : img.naturalHeight);
    const weight = settings.repeatBehavior === 'perImage' ? Math.max(1, img.copies) : 1;
    aspectWeightSum += (w / h) * weight;
    totalWeight += weight;
  }
  const avgAspect = aspectWeightSum / Math.max(1, totalWeight);
  const avgAspectLabel = describeAspectRatio(avgAspect);

  const currentEval = evaluateGridCandidate(
    images,
    settings,
    settings.columns,
    settings.rows,
    settings.orientation
  );

  const totalItems =
    settings.repeatBehavior === 'perImage'
      ? images.reduce((sum, img) => sum + Math.max(1, img.copies), 0)
      : images.length;

  // Determine sensible search bounds for an N-Up grid
  const minSlots =
    settings.repeatBehavior === 'fillPage'
      ? Math.max(4, images.length)
      : totalItems === 1
        ? 1
        : Math.min(2, totalItems);

  const maxSlots =
    settings.repeatBehavior === 'fillPage'
      ? Math.min(24, Math.max(16, images.length * 2))
      : Math.min(36, Math.max(16, totalItems));

  const orientations: Orientation[] =
    settings.orientation === 'portrait' ? ['portrait', 'landscape'] : ['landscape', 'portrait'];

  let best = {
    columns: settings.columns,
    rows: settings.rows,
    orientation: settings.orientation,
    score: currentEval.efficiency,
    efficiency: currentEval.efficiency,
    pagesNeeded: currentEval.pagesNeeded,
    emptySlots: currentEval.emptySlots,
  };

  for (const orient of orientations) {
    for (let cols = 1; cols <= 8; cols++) {
      for (let rows = 1; rows <= 10; rows++) {
        const slots = cols * rows;
        if (slots < minSlots || slots > maxSlots) continue;
        // Avoid overly skinny 1xN strips unless there are very few items
        if ((cols === 1 || rows === 1) && slots > 4) continue;

        const res = evaluateGridCandidate(images, settings, cols, rows, orient);
        // Gentle preference for keeping user's current paper orientation unless flipping saves > 3%
        const orientBonus = orient === settings.orientation ? 0.025 : 0;
        // Slight preference for fitting everything on 1 page if efficiency is near-identical
        const singlePageBonus = res.pagesNeeded === 1 ? 0.01 : 0;
        const score = res.efficiency + orientBonus + singlePageBonus;

        if (score > best.score + 0.004) {
          best = {
            columns: cols,
            rows,
            orientation: orient,
            score,
            efficiency: res.efficiency,
            pagesNeeded: res.pagesNeeded,
            emptySlots: res.emptySlots,
          };
        }
      }
    }
  }

  const currentEfficiencyPercent = Math.round(currentEval.efficiency * 100);
  const efficiencyPercent = Math.round(best.efficiency * 100);
  const improvementPercent = Math.max(0, efficiencyPercent - currentEfficiencyPercent);
  const isAlreadyOptimal =
    best.columns === settings.columns &&
    best.rows === settings.rows &&
    best.orientation === settings.orientation;

  let reason = `Best match for your ${avgAspectLabel} photos`;
  if (best.emptySlots === 0 && best.pagesNeeded === 1) {
    reason += ' with zero empty slots on 1 page.';
  } else if (best.emptySlots === 0) {
    reason += ` with zero wasted slots across ${best.pagesNeeded} pages.`;
  } else {
    reason += ` (${best.emptySlots} empty ${best.emptySlots === 1 ? 'slot' : 'slots'} across ${best.pagesNeeded} ${best.pagesNeeded === 1 ? 'page' : 'pages'}).`;
  }

  return {
    columns: best.columns,
    rows: best.rows,
    orientation: best.orientation,
    efficiencyPercent,
    currentEfficiencyPercent,
    improvementPercent,
    pagesNeeded: best.pagesNeeded,
    emptySlots: best.emptySlots,
    avgAspectLabel,
    reason,
    isAlreadyOptimal,
  };
}

