import type { SheetGeometry, SlotPlacement } from '../types/sheet';

export interface AlignmentAxisMatch {
  positionMm: number;
  isPageCenter: boolean;
  gridIndex: number | null; // 0-based column or row index when aligned to a slot axis
  label: string;
}

export interface AlignmentSnapResult {
  snappedCenterXMm: number;
  snappedCenterYMm: number;
  rawCenterXMm: number;
  rawCenterYMm: number;
  verticalGuide: AlignmentAxisMatch | null;
  horizontalGuide: AlignmentAxisMatch | null;
  targetSlot: SlotPlacement | null;
  isCenteredBothPageAxes: boolean;
}

/**
 * Computes horizontal & vertical centering alignment guides and magnetic snapping
 * in sheet millimeter coordinates while dragging an image tile on the canvas.
 */
export function computeAlignmentSnap(
  rawCenterXMm: number,
  rawCenterYMm: number,
  geometry: SheetGeometry,
  slots: SlotPlacement[]
): AlignmentSnapResult {
  const pageCenterX = geometry.pageWidthMm / 2;
  const pageCenterY = geometry.pageHeightMm / 2;
  const snapThresholdMm = Math.max(
    3.5,
    Math.min(geometry.cellWidthMm, geometry.cellHeightMm) * 0.15
  );

  const originOffsetMm = geometry.bleedMm + geometry.marginMm;

  // Build unique X alignment candidates (page vertical center + column centers)
  const xCandidates: { posMm: number; colIndex: number | null }[] = [
    { posMm: pageCenterX, colIndex: null },
  ];
  for (let c = 0; c < geometry.columns; c++) {
    const colCenterX =
      originOffsetMm + c * (geometry.cellWidthMm + geometry.gapMm) + geometry.cellWidthMm / 2;
    const existing = xCandidates.find((cand) => Math.abs(cand.posMm - colCenterX) < 0.15);
    if (existing) {
      existing.colIndex = c;
    } else {
      xCandidates.push({ posMm: colCenterX, colIndex: c });
    }
  }

  // Build unique Y alignment candidates (page horizontal center + row centers)
  const yCandidates: { posMm: number; rowIndex: number | null }[] = [
    { posMm: pageCenterY, rowIndex: null },
  ];
  for (let r = 0; r < geometry.rows; r++) {
    const rowCenterY =
      originOffsetMm + r * (geometry.cellHeightMm + geometry.gapMm) + geometry.cellHeightMm / 2;
    const existing = yCandidates.find((cand) => Math.abs(cand.posMm - rowCenterY) < 0.15);
    if (existing) {
      existing.rowIndex = r;
    } else {
      yCandidates.push({ posMm: rowCenterY, rowIndex: r });
    }
  }

  let bestX: { posMm: number; colIndex: number | null; dist: number } | null = null;
  for (const cand of xCandidates) {
    const dist = Math.abs(rawCenterXMm - cand.posMm);
    if (dist <= snapThresholdMm && (!bestX || dist < bestX.dist)) {
      bestX = { ...cand, dist };
    }
  }

  let bestY: { posMm: number; rowIndex: number | null; dist: number } | null = null;
  for (const cand of yCandidates) {
    const dist = Math.abs(rawCenterYMm - cand.posMm);
    if (dist <= snapThresholdMm && (!bestY || dist < bestY.dist)) {
      bestY = { ...cand, dist };
    }
  }

  const snappedCenterXMm = bestX ? bestX.posMm : rawCenterXMm;
  const snappedCenterYMm = bestY ? bestY.posMm : rawCenterYMm;

  let verticalGuide: AlignmentAxisMatch | null = null;
  if (bestX) {
    const isPageCenter = Math.abs(bestX.posMm - pageCenterX) < 0.15;
    const label =
      isPageCenter && bestX.colIndex !== null
        ? `V-Center · Col ${bestX.colIndex + 1}`
        : isPageCenter
          ? 'Page V-Center'
          : `Col ${(bestX.colIndex ?? 0) + 1} Center`;
    verticalGuide = {
      positionMm: bestX.posMm,
      isPageCenter,
      gridIndex: bestX.colIndex,
      label,
    };
  }

  let horizontalGuide: AlignmentAxisMatch | null = null;
  if (bestY) {
    const isPageCenter = Math.abs(bestY.posMm - pageCenterY) < 0.15;
    const label =
      isPageCenter && bestY.rowIndex !== null
        ? `H-Center · Row ${bestY.rowIndex + 1}`
        : isPageCenter
          ? 'Page H-Center'
          : `Row ${(bestY.rowIndex ?? 0) + 1} Center`;
    horizontalGuide = {
      positionMm: bestY.posMm,
      isPageCenter,
      gridIndex: bestY.rowIndex,
      label,
    };
  }

  // Find target slot underneath the snapped tile center (with half-gap tolerance)
  const padX = Math.max(2, geometry.gapMm * 0.55);
  const padY = Math.max(2, geometry.gapMm * 0.55);
  let targetSlot: SlotPlacement | null = null;

  for (const slot of slots) {
    if (
      snappedCenterXMm >= slot.xMm - padX &&
      snappedCenterXMm <= slot.xMm + slot.widthMm + padX &&
      snappedCenterYMm >= slot.yMm - padY &&
      snappedCenterYMm <= slot.yMm + slot.heightMm + padY
    ) {
      targetSlot = slot;
      break;
    }
  }

  const isCenteredBothPageAxes = Boolean(
    verticalGuide?.isPageCenter && horizontalGuide?.isPageCenter
  );

  return {
    snappedCenterXMm,
    snappedCenterYMm,
    rawCenterXMm,
    rawCenterYMm,
    verticalGuide,
    horizontalGuide,
    targetSlot,
    isCenteredBothPageAxes,
  };
}
