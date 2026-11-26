import React from 'react';
import type { LayoutSettings, SheetGeometry, SlotPlacement } from '../types/sheet';
import type { AlignmentSnapResult } from '../utils/alignmentGuides';
import { getImageCssFilter } from '../utils/layoutEngine';
import { useProcessedPreviewUrl } from '../utils/processedPreview';

interface AlignmentGuidesOverlayProps {
  geometry: SheetGeometry;
  alignment: AlignmentSnapResult;
}

export const AlignmentGuidesOverlay: React.FC<AlignmentGuidesOverlayProps> = ({
  geometry,
  alignment,
}) => {
  const { pageWidthMm, pageHeightMm } = geometry;
  const pageCenterX = pageWidthMm / 2;
  const pageCenterY = pageHeightMm / 2;
  const { verticalGuide, horizontalGuide, isCenteredBothPageAxes } = alignment;

  const strokeScale = Math.max(0.75, Math.min(1.6, Math.max(pageWidthMm, pageHeightMm) / 260));
  const vColor = verticalGuide?.isPageCenter ? '#E11D48' : '#2563EB';
  const hColor = horizontalGuide?.isPageCenter ? '#E11D48' : '#2563EB';

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
      <svg
        viewBox={`0 0 ${pageWidthMm} ${pageHeightMm}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Subtle reference sheet center axes while dragging */}
        {!verticalGuide?.isPageCenter && (
          <line
            x1={pageCenterX}
            y1={0}
            x2={pageCenterX}
            y2={pageHeightMm}
            stroke="#94A3B8"
            strokeOpacity={0.45}
            strokeWidth={0.3 * strokeScale}
            strokeDasharray={`${1.8 * strokeScale} ${1.8 * strokeScale}`}
          />
        )}
        {!horizontalGuide?.isPageCenter && (
          <line
            x1={0}
            y1={pageCenterY}
            x2={pageWidthMm}
            y2={pageCenterY}
            stroke="#94A3B8"
            strokeOpacity={0.45}
            strokeWidth={0.3 * strokeScale}
            strokeDasharray={`${1.8 * strokeScale} ${1.8 * strokeScale}`}
          />
        )}

        {/* Active Vertical Centering Guide */}
        {verticalGuide && (
          <g>
            <line
              x1={verticalGuide.positionMm}
              y1={0}
              x2={verticalGuide.positionMm}
              y2={pageHeightMm}
              stroke={vColor}
              strokeWidth={0.5 * strokeScale}
              strokeDasharray={
                verticalGuide.isPageCenter
                  ? undefined
                  : `${2.8 * strokeScale} ${1.6 * strokeScale}`
              }
            />
            {/* Top & bottom edge alignment ticks */}
            <line
              x1={verticalGuide.positionMm - 2.2 * strokeScale}
              y1={1.2 * strokeScale}
              x2={verticalGuide.positionMm + 2.2 * strokeScale}
              y2={1.2 * strokeScale}
              stroke={vColor}
              strokeWidth={0.55 * strokeScale}
            />
            <line
              x1={verticalGuide.positionMm - 2.2 * strokeScale}
              y1={pageHeightMm - 1.2 * strokeScale}
              x2={verticalGuide.positionMm + 2.2 * strokeScale}
              y2={pageHeightMm - 1.2 * strokeScale}
              stroke={vColor}
              strokeWidth={0.55 * strokeScale}
            />
          </g>
        )}

        {/* Active Horizontal Centering Guide */}
        {horizontalGuide && (
          <g>
            <line
              x1={0}
              y1={horizontalGuide.positionMm}
              x2={pageWidthMm}
              y2={horizontalGuide.positionMm}
              stroke={hColor}
              strokeWidth={0.5 * strokeScale}
              strokeDasharray={
                horizontalGuide.isPageCenter
                  ? undefined
                  : `${2.8 * strokeScale} ${1.6 * strokeScale}`
              }
            />
            {/* Left & right edge alignment ticks */}
            <line
              x1={1.2 * strokeScale}
              y1={horizontalGuide.positionMm - 2.2 * strokeScale}
              x2={1.2 * strokeScale}
              y2={horizontalGuide.positionMm + 2.2 * strokeScale}
              stroke={hColor}
              strokeWidth={0.55 * strokeScale}
            />
            <line
              x1={pageWidthMm - 1.2 * strokeScale}
              y1={horizontalGuide.positionMm - 2.2 * strokeScale}
              x2={pageWidthMm - 1.2 * strokeScale}
              y2={horizontalGuide.positionMm + 2.2 * strokeScale}
              stroke={hColor}
              strokeWidth={0.55 * strokeScale}
            />
          </g>
        )}

        {/* Precision Center Intersection Crosshair */}
        {verticalGuide && horizontalGuide && (
          <g>
            <circle
              cx={verticalGuide.positionMm}
              cy={horizontalGuide.positionMm}
              r={2.2 * strokeScale}
              fill="#FFFFFF"
              fillOpacity={0.9}
              stroke={isCenteredBothPageAxes ? '#E11D48' : '#2563EB'}
              strokeWidth={0.55 * strokeScale}
            />
            <line
              x1={verticalGuide.positionMm - 3.6 * strokeScale}
              y1={horizontalGuide.positionMm}
              x2={verticalGuide.positionMm + 3.6 * strokeScale}
              y2={horizontalGuide.positionMm}
              stroke={isCenteredBothPageAxes ? '#E11D48' : '#2563EB'}
              strokeWidth={0.45 * strokeScale}
            />
            <line
              x1={verticalGuide.positionMm}
              y1={horizontalGuide.positionMm - 3.6 * strokeScale}
              x2={verticalGuide.positionMm}
              y2={horizontalGuide.positionMm + 3.6 * strokeScale}
              stroke={isCenteredBothPageAxes ? '#E11D48' : '#2563EB'}
              strokeWidth={0.45 * strokeScale}
            />
          </g>
        )}
      </svg>

      {/* Crisp Axis Labels positioned directly beside active guide lines */}
      {verticalGuide && (
        <div
          style={{
            left: `${(verticalGuide.positionMm / pageWidthMm) * 100}%`,
          }}
          className={`absolute top-1.5 -translate-x-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight text-white shadow-sm whitespace-nowrap ${
            verticalGuide.isPageCenter ? 'bg-rose-600' : 'bg-blue-600'
          }`}
        >
          {verticalGuide.label}
        </div>
      )}

      {horizontalGuide && (
        <div
          style={{
            top: `${(horizontalGuide.positionMm / pageHeightMm) * 100}%`,
          }}
          className={`absolute left-1.5 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight text-white shadow-sm whitespace-nowrap ${
            horizontalGuide.isPageCenter ? 'bg-rose-600' : 'bg-blue-600'
          }`}
        >
          {horizontalGuide.label}
        </div>
      )}
    </div>
  );
};

interface FloatingDraggedTileProps {
  slot: SlotPlacement;
  geometry: SheetGeometry;
  settings: LayoutSettings;
  centerXMm: number;
  centerYMm: number;
  isSnappedToCenter: boolean;
}

export const FloatingDraggedTile: React.FC<FloatingDraggedTileProps> = ({
  slot,
  geometry,
  settings,
  centerXMm,
  centerYMm,
  isSnappedToCenter,
}) => {
  const image = slot.image;
  const previewSrc = useProcessedPreviewUrl(
    image?.dataUrl || '',
    slot.effectiveRotation,
    image?.crop
  );

  if (!image || !slot.drawRectMm) return null;

  const leftPct = ((centerXMm - slot.widthMm / 2) / geometry.pageWidthMm) * 100;
  const topPct = ((centerYMm - slot.heightMm / 2) / geometry.pageHeightMm) * 100;
  const widthPct = (slot.widthMm / geometry.pageWidthMm) * 100;
  const heightPct = (slot.heightMm / geometry.pageHeightMm) * 100;

  const drawLeftPct = (slot.drawRectMm.x / slot.widthMm) * 100;
  const drawTopPct = (slot.drawRectMm.y / slot.heightMm) * 100;
  const drawWidthPct = (slot.drawRectMm.width / slot.widthMm) * 100;
  const drawHeightPct = (slot.drawRectMm.height / slot.heightMm) * 100;

  const effectiveFit =
    settings.lockAspectRatio && settings.fitMode === 'stretch' ? 'cover' : settings.fitMode;
  const objectFitClass =
    effectiveFit === 'cover'
      ? 'object-cover'
      : effectiveFit === 'stretch'
        ? 'object-fill'
        : 'object-contain';

  return (
    <div
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
      className={`pointer-events-none absolute z-30 ${
        geometry.slotBleedMm > 0 ? '' : 'overflow-hidden'
      } bg-white/75 shadow-2xl transition-[box-shadow] duration-75 ${
        isSnappedToCenter
          ? 'ring-2 ring-rose-600'
          : 'ring-2 ring-blue-600'
      }`}
    >
      <img
        src={previewSrc}
        alt={image.name}
        referrerPolicy="no-referrer"
        draggable={false}
        style={{
          left: `${drawLeftPct}%`,
          top: `${drawTopPct}%`,
          width: `${drawWidthPct}%`,
          height: `${drawHeightPct}%`,
          filter: getImageCssFilter(image.filter),
        }}
        className={`absolute ${objectFitClass} opacity-90`}
      />
      {/* Subtle center crosshair inside the dragged image tile so users can visually align its center to the sheet guides */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`h-3 w-3 rounded-full border ${
            isSnappedToCenter
              ? 'border-rose-500 bg-rose-500/20'
              : 'border-blue-500 bg-blue-500/20'
          }`}
        />
      </div>
    </div>
  );
};
