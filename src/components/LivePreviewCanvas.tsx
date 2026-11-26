import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  CreditCard,
  Eye,
  GripVertical,
  HelpCircle,
  ImagePlus,
  Images,
  Keyboard,
  Layers,
  Lock,
  Maximize2,
  RotateCw,
  Ruler,
  Sparkles,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ComputedPage, LayoutSettings, SheetGeometry, SlotPlacement } from '../types/sheet';
import { computeAlignmentSnap, type AlignmentSnapResult } from '../utils/alignmentGuides';
import { formatDimensions, formatLength, getImageCssFilter, PAPER_DEFINITIONS } from '../utils/layoutEngine';
import { useProcessedPreviewUrl } from '../utils/processedPreview';
import { AlignmentGuidesOverlay, FloatingDraggedTile } from './AlignmentGuidesOverlay';

export type StarterGoal = 'repeatOne' | 'multiPhoto' | 'cards';

interface LivePreviewCanvasProps {
  pages: ComputedPage[];
  geometry: SheetGeometry;
  settings: LayoutSettings;
  viewMode: 'single' | 'all';
  activePageIndex: number;
  selectedImageId: string | null;
  hasImages: boolean;
  imageCount: number;
  canUndo: boolean;
  shortcutsOpen: boolean;
  onUndo: () => void;
  onOpenHelp: () => void;
  onToggleShortcuts: () => void;
  onQuickStartGoal: (goal: StarterGoal) => void;
  onSelectPage: (index: number) => void;
  onSwitchViewMode: (mode: 'single' | 'all') => void;
  onSelectImage: (id: string | null) => void;
  onFilesDropped: (files: FileList | File[]) => void;
  onOpenFilePicker: () => void;
  onLoadSamples: () => void;
  onRotateImage: (imageId: string) => void;
  onIncrementCopy: (imageId: string) => void;
  onRemoveImage: (imageId: string) => void;
  onReorderImages: (fromIndex: number, toIndex: number) => void;
  onToggleSetting: (key: 'showRulers' | 'showResolutionOverlay') => void;
}


interface SlotContentProps {
  slot: SlotPlacement;
  geometry: SheetGeometry;
  settings: LayoutSettings;
  isSelected: boolean;
  isDragSource: boolean;
  isDragTarget: boolean;
  isCanvasDragging: boolean;
  compact?: boolean;
  justDraggedRef?: React.MutableRefObject<boolean>;
  onSelectImage: (id: string | null) => void;
  onRotateImage: (id: string) => void;
  onIncrementCopy: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onOpenFilePicker: () => void;
  onPointerDownSlot: (e: React.PointerEvent<HTMLDivElement>, slot: SlotPlacement) => void;
}

const SheetSlotView: React.FC<SlotContentProps> = ({
  slot,
  geometry,
  settings,
  isSelected,
  isDragSource,
  isDragTarget,
  isCanvasDragging,
  compact = false,
  justDraggedRef,
  onSelectImage,
  onRotateImage,
  onIncrementCopy,
  onRemoveImage,
  onOpenFilePicker,
  onPointerDownSlot,
}) => {
  const image = slot.image;
  const previewSrc = useProcessedPreviewUrl(
    image?.dataUrl || '',
    slot.effectiveRotation,
    image?.crop
  );

  const leftPct = (slot.xMm / geometry.pageWidthMm) * 100;
  const topPct = (slot.yMm / geometry.pageHeightMm) * 100;
  const widthPct = (slot.widthMm / geometry.pageWidthMm) * 100;
  const heightPct = (slot.heightMm / geometry.pageHeightMm) * 100;

  if (!image || !slot.drawRectMm) {
    return (
      <button
        type="button"
        onClick={onOpenFilePicker}
        title="Empty grid box — click to add a photo"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
        }}
        className={`absolute group flex items-center justify-center border transition-colors cursor-pointer ${
          isDragTarget && !compact
            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/80 ring-inset z-20'
            : 'border-dashed border-zinc-300/80 bg-zinc-50/40 hover:bg-blue-50/50 hover:border-blue-400'
        }`}
      >
        {!compact && (isDragTarget || geometry.slotsPerPage <= 25) && (
          <span
            className={`font-mono text-[10px] tabular-nums transition-colors ${
              isDragTarget
                ? 'font-semibold text-blue-700'
                : 'text-zinc-400 group-hover:text-blue-600'
            }`}
          >
            {isDragTarget ? `Place #${slot.slotIndex + 1}` : `+${slot.slotIndex + 1}`}
          </span>
        )}
      </button>
    );
  }

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
      onPointerDown={(e) => {
        if (compact) return;
        onPointerDownSlot(e, slot);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (justDraggedRef?.current) return;
        onSelectImage(image.id);
      }}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
      className={`absolute group ${
        geometry.slotBleedMm > 0 ? '' : 'overflow-hidden'
      } select-none transition-[box-shadow,opacity] duration-150 ${
        compact ? '' : 'cursor-grab active:cursor-grabbing'
      } ${
        isDragSource && !compact
          ? 'opacity-35 ring-1 ring-dashed ring-zinc-400'
          : isDragTarget && !compact
            ? 'ring-2 ring-blue-600 ring-inset z-20'
            : isSelected && !compact && !isCanvasDragging
              ? 'ring-2 ring-blue-600/80 ring-inset z-10'
              : ''
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
        className={`absolute ${objectFitClass} pointer-events-none`}
      />

      {/* Keep overlays & badges neatly inside the trim boundary even when artwork bleeds outside */}
      <div className="relative h-full w-full overflow-hidden pointer-events-none">
        {!compact && settings.showResolutionOverlay && (
          <div className="absolute inset-0 bg-zinc-950/55 text-white flex flex-col items-center justify-center p-1.5 text-center pointer-events-none">
            <span className="font-mono text-[10px] font-semibold tabular-nums leading-tight">
              {slot.effectiveDpi} DPI
            </span>
            <span className="font-mono text-[9px] tabular-nums text-zinc-200 mt-0.5 leading-tight">
              {geometry.targetCellPxW}×{geometry.targetCellPxH}px
            </span>
            {slot.isLowRes && (
              <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-300">
                <AlertTriangle className="w-2.5 h-2.5" />
                May print soft
              </span>
            )}
          </div>
        )}

        {!compact && !settings.showResolutionOverlay && slot.isLowRes && (
          <div
            title={`This photo is ${slot.effectiveDpi} DPI at this print size (may look slightly soft when printed at ${settings.dpi} DPI)`}
            className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-amber-500/95 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow-sm pointer-events-none"
          >
            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
            <span>{slot.effectiveDpi} DPI</span>
          </div>
        )}

        {/* Visual Aspect Ratio Lock Indicator on Image */}
        {!compact && !settings.showResolutionOverlay && settings.lockAspectRatio && (
          <div
            title="Aspect ratio locked — proportions protected from stretching"
            aria-label="Aspect ratio locked"
            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded bg-zinc-900/65 text-white/95 shadow-xs backdrop-blur-[2px] pointer-events-none"
          >
            <Lock className="w-2.5 h-2.5" />
          </div>
        )}

        {!compact && !isCanvasDragging && (
          <div className="drag-grip pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-zinc-950/75 via-zinc-950/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            <div className="flex items-center gap-1 text-[10px] font-mono text-white/95 truncate">
              <GripVertical className="w-3 h-3 shrink-0 opacity-80" />
              <span className="truncate">#{slot.imageQueueIndex + 1}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                title="Rotate 90°"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateImage(image.id);
                }}
                className="rounded p-1 text-white/90 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              {settings.repeatBehavior === 'perImage' && (
                <button
                  type="button"
                  title="Add +1 copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIncrementCopy(image.id);
                  }}
                  className="rounded p-1 text-white/90 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <CopyPlus className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                title="Remove photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(image.id);
                }}
                className="rounded p-1 text-white/90 hover:bg-red-500/80 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SheetGuidesOverlay: React.FC<{
  slots: SlotPlacement[];
  geometry: SheetGeometry;
  settings: LayoutSettings;
}> = ({ slots, geometry, settings }) => {
  if (settings.guideStyle === 'none') return null;

  const filledSlots = slots.filter((s) => s.image !== null);
  if (filledSlots.length === 0) return null;

  const outerSpace = geometry.marginMm + geometry.bleedMm;
  const tick = Math.min(3.5, Math.max(1.8, Math.min(outerSpace * 0.55, 3.5)));
  const offset = Math.min(0.8, geometry.gapMm > 2 ? 0.6 : 0);

  return (
    <svg
      viewBox={`0 0 ${geometry.pageWidthMm} ${geometry.pageHeightMm}`}
      className="absolute inset-0 h-full w-full pointer-events-none z-20"
      aria-hidden="true"
    >
      {settings.guideStyle === 'solidBorder' &&
        filledSlots.map((slot) => (
          <rect
            key={slot.slotIndex}
            x={slot.xMm}
            y={slot.yMm}
            width={slot.widthMm}
            height={slot.heightMm}
            fill="none"
            stroke={settings.guideColor}
            strokeWidth={0.28}
          />
        ))}

      {settings.guideStyle === 'dashedLines' &&
        filledSlots.map((slot) => (
          <rect
            key={slot.slotIndex}
            x={slot.xMm}
            y={slot.yMm}
            width={slot.widthMm}
            height={slot.heightMm}
            fill="none"
            stroke={settings.guideColor}
            strokeWidth={0.3}
            strokeDasharray="1.8 1.5"
          />
        ))}

      {settings.guideStyle === 'cropMarks' && (
        <>
          {geometry.bleedMm > 0 && (
            <g stroke={settings.guideColor} strokeWidth={0.3} strokeLinecap="square">
              <line x1={0} y1={geometry.bleedMm} x2={Math.min(geometry.bleedMm * 0.85, 3.2)} y2={geometry.bleedMm} />
              <line x1={geometry.bleedMm} y1={0} x2={geometry.bleedMm} y2={Math.min(geometry.bleedMm * 0.85, 3.2)} />
              <line
                x1={geometry.pageWidthMm - Math.min(geometry.bleedMm * 0.85, 3.2)}
                y1={geometry.bleedMm}
                x2={geometry.pageWidthMm}
                y2={geometry.bleedMm}
              />
              <line
                x1={geometry.bleedMm + geometry.trimPageWidthMm}
                y1={0}
                x2={geometry.bleedMm + geometry.trimPageWidthMm}
                y2={Math.min(geometry.bleedMm * 0.85, 3.2)}
              />
              <line
                x1={0}
                y1={geometry.bleedMm + geometry.trimPageHeightMm}
                x2={Math.min(geometry.bleedMm * 0.85, 3.2)}
                y2={geometry.bleedMm + geometry.trimPageHeightMm}
              />
              <line
                x1={geometry.bleedMm}
                y1={geometry.pageHeightMm - Math.min(geometry.bleedMm * 0.85, 3.2)}
                x2={geometry.bleedMm}
                y2={geometry.pageHeightMm}
              />
              <line
                x1={geometry.pageWidthMm - Math.min(geometry.bleedMm * 0.85, 3.2)}
                y1={geometry.bleedMm + geometry.trimPageHeightMm}
                x2={geometry.pageWidthMm}
                y2={geometry.bleedMm + geometry.trimPageHeightMm}
              />
              <line
                x1={geometry.bleedMm + geometry.trimPageWidthMm}
                y1={geometry.pageHeightMm - Math.min(geometry.bleedMm * 0.85, 3.2)}
                x2={geometry.bleedMm + geometry.trimPageWidthMm}
                y2={geometry.pageHeightMm}
              />
            </g>
          )}
          {filledSlots.map((slot) => {
            const x1 = slot.xMm;
            const y1 = slot.yMm;
            const x2 = slot.xMm + slot.widthMm;
            const y2 = slot.yMm + slot.heightMm;
            return (
              <g
                key={slot.slotIndex}
                stroke={settings.guideColor}
                strokeWidth={0.3}
                strokeLinecap="square"
              >
                <line x1={x1 - offset - tick} y1={y1} x2={x1 - offset} y2={y1} />
                <line x1={x1} y1={y1 - offset - tick} x2={x1} y2={y1 - offset} />
                <line x1={x2 + offset} y1={y1} x2={x2 + offset + tick} y2={y1} />
                <line x1={x2} y1={y1 - offset - tick} x2={x2} y2={y1 - offset} />
                <line x1={x1 - offset - tick} y1={y2} x2={x1 - offset} y2={y2} />
                <line x1={x1} y1={y2 + offset} x2={x1} y2={y2 + offset + tick} />
                <line x1={x2 + offset} y1={y2} x2={x2 + offset + tick} y2={y2} />
                <line x1={x2} y1={y2 + offset} x2={x2} y2={y2 + offset + tick} />
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
};

const SheetRulers: React.FC<{
  widthPx: number;
  heightPx: number;
  geometry: SheetGeometry;
  unit: 'mm' | 'in';
}> = ({ widthPx, heightPx, geometry, unit }) => {
  const stepUnit = unit === 'in' ? 1 : 20;
  const maxW = unit === 'in' ? geometry.pageWidthMm / 25.4 : geometry.pageWidthMm;
  const maxH = unit === 'in' ? geometry.pageHeightMm / 25.4 : geometry.pageHeightMm;

  const xTicks: number[] = [];
  for (let v = 0; v <= maxW + 0.001; v += stepUnit) xTicks.push(v);

  const yTicks: number[] = [];
  for (let v = 0; v <= maxH + 0.001; v += stepUnit) yTicks.push(v);

  return (
    <>
      <div
        style={{ width: `${widthPx}px` }}
        className="absolute -top-6 left-0 h-5 select-none pointer-events-none border-b border-zinc-300/80"
        aria-hidden="true"
      >
        {xTicks.map((val) => {
          const pct = (val / maxW) * 100;
          return (
            <div
              key={val}
              style={{ left: `${pct}%` }}
              className="absolute bottom-0 flex flex-col items-start"
            >
              <span className="font-mono text-[9px] tabular-nums text-zinc-500 pl-0.5 leading-none mb-0.5">
                {val === 0 ? `0${unit}` : Math.round(val)}
              </span>
              <span className="h-1.5 w-px bg-zinc-400" />
            </div>
          );
        })}
      </div>

      <div
        style={{ height: `${heightPx}px` }}
        className="absolute top-0 -left-7 w-6 select-none pointer-events-none border-r border-zinc-300/80"
        aria-hidden="true"
      >
        {yTicks.map((val) => {
          const pct = (val / maxH) * 100;
          return (
            <div
              key={val}
              style={{ top: `${pct}%` }}
              className="absolute right-0 flex items-center"
            >
              <span className="font-mono text-[9px] tabular-nums text-zinc-500 pr-1 leading-none">
                {Math.round(val)}
              </span>
              <span className="w-1.5 h-px bg-zinc-400" />
            </div>
          );
        })}
      </div>
    </>
  );
};

export const LivePreviewCanvas: React.FC<LivePreviewCanvasProps> = ({
  pages,
  geometry,
  settings,
  viewMode,
  activePageIndex,
  selectedImageId,
  hasImages,
  imageCount,
  canUndo,
  shortcutsOpen,
  onUndo,
  onOpenHelp,
  onToggleShortcuts,
  onQuickStartGoal,
  onSelectPage,
  onSwitchViewMode,
  onSelectImage,
  onFilesDropped,
  onOpenFilePicker,
  onLoadSamples,
  onRotateImage,
  onIncrementCopy,
  onRemoveImage,
  onReorderImages,
  onToggleSetting,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 840, height: 640 });
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [manualZoom, setManualZoom] = useState(1);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const pendingDragRef = useRef<{
    slot: SlotPlacement;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    grabOffsetXMm: number;
    grabOffsetYMm: number;
  } | null>(null);
  const activeDragRef = useRef<{
    sourceSlot: SlotPlacement;
    alignment: AlignmentSnapResult;
  } | null>(null);
  const justDraggedRef = useRef(false);
  const [activeDrag, setActiveDrag] = useState<{
    sourceSlot: SlotPlacement;
    alignment: AlignmentSnapResult;
  } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      setViewportSize({
        width: Math.max(300, el.clientWidth),
        height: Math.max(300, el.clientHeight),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const safePageIndex = Math.min(activePageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] || pages[0];

  const sheetDimensionsPx = useMemo(() => {
    const paddingX = settings.showRulers ? 104 : 64;
    const paddingY = settings.showRulers ? 96 : 64;
    const availW = Math.max(220, viewportSize.width - paddingX);
    const availH = Math.max(220, viewportSize.height - paddingY);

    const aspect = geometry.pageWidthMm / geometry.pageHeightMm;
    let fitW = availW;
    let fitH = fitW / aspect;
    if (fitH > availH) {
      fitH = availH;
      fitW = fitH * aspect;
    }

    const actualPxPerMm = 96 / 25.4;
    const fullW = geometry.pageWidthMm * actualPxPerMm;
    const fullH = geometry.pageHeightMm * actualPxPerMm;

    if (zoomMode === 'fit') {
      return {
        width: Math.round(fitW),
        height: Math.round(fitH),
        effectiveZoomPercent: Math.round((fitW / fullW) * 100),
      };
    }

    return {
      width: Math.round(fullW * manualZoom),
      height: Math.round(fullH * manualZoom),
      effectiveZoomPercent: Math.round(manualZoom * 100),
    };
  }, [geometry.pageWidthMm, geometry.pageHeightMm, viewportSize, zoomMode, manualZoom, settings.showRulers]);

  const lowResCount = useMemo(() => {
    let count = 0;
    for (const p of pages) {
      for (const s of p.slots) {
        if (s.image && s.isLowRes) count++;
      }
    }
    return count;
  }, [pages]);

  const totalPlacedImages = useMemo(
    () => pages.reduce((acc, p) => acc + p.filledCount, 0),
    [pages]
  );

  const paperLabel = PAPER_DEFINITIONS[settings.paperSize]?.label || 'Custom';
  const showRulersNow = settings.showRulers && hasImages;

  const handleZoomStep = (delta: number) => {
    const currentRatio =
      zoomMode === 'fit' ? sheetDimensionsPx.effectiveZoomPercent / 100 : manualZoom;
    const next = Math.max(0.25, Math.min(2.2, Math.round((currentRatio + delta) * 10) / 10));
    setZoomMode('manual');
    setManualZoom(next);
  };

  // Keyboard zoom shortcuts (+, -, 0 to fit) when in Single Sheet view
  useEffect(() => {
    if (viewMode !== 'single') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const currentRatio =
          zoomMode === 'fit' ? sheetDimensionsPx.effectiveZoomPercent / 100 : manualZoom;
        const next = Math.max(0.25, Math.min(2.2, Math.round((currentRatio + 0.15) * 10) / 10));
        setZoomMode('manual');
        setManualZoom(next);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const currentRatio =
          zoomMode === 'fit' ? sheetDimensionsPx.effectiveZoomPercent / 100 : manualZoom;
        const next = Math.max(0.25, Math.min(2.2, Math.round((currentRatio - 0.15) * 10) / 10));
        setZoomMode('manual');
        setManualZoom(next);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomMode('fit');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, zoomMode, manualZoom, sheetDimensionsPx.effectiveZoomPercent]);

  // Pointer-tracked canvas drag with real-time horizontal/vertical centering guides
  const handlePointerDownSlot = (e: React.PointerEvent<HTMLDivElement>, slot: SlotPlacement) => {
    if (viewMode !== 'single' || !slot.image) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const sheetEl = sheetRef.current;
    if (!sheetEl) return;

    // On touch devices, require starting from the grip strip so normal page scrolling isn't blocked
    if (e.pointerType === 'touch' && !(e.target as HTMLElement).closest('.drag-grip')) {
      return;
    }

    if (e.pointerType !== 'touch') {
      e.preventDefault();
    }

    const rect = sheetEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pointerMmX = ((e.clientX - rect.left) / rect.width) * geometry.pageWidthMm;
    const pointerMmY = ((e.clientY - rect.top) / rect.height) * geometry.pageHeightMm;

    pendingDragRef.current = {
      slot,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      grabOffsetXMm: pointerMmX - slot.xMm,
      grabOffsetYMm: pointerMmY - slot.yMm,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;

      if (!activeDragRef.current) {
        const dist = Math.hypot(
          e.clientX - pending.startClientX,
          e.clientY - pending.startClientY
        );
        if (dist < 5) return;
        justDraggedRef.current = true;
      }

      const sheetEl = sheetRef.current;
      if (!sheetEl) return;
      const rect = sheetEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const pointerMmX = ((e.clientX - rect.left) / rect.width) * geometry.pageWidthMm;
      const pointerMmY = ((e.clientY - rect.top) / rect.height) * geometry.pageHeightMm;
      const rawCenterXMm = pointerMmX - pending.grabOffsetXMm + geometry.cellWidthMm / 2;
      const rawCenterYMm = pointerMmY - pending.grabOffsetYMm + geometry.cellHeightMm / 2;

      const alignment = computeAlignmentSnap(
        rawCenterXMm,
        rawCenterYMm,
        geometry,
        currentPage.slots
      );

      const nextState = {
        sourceSlot: pending.slot,
        alignment,
      };
      activeDragRef.current = nextState;
      setActiveDrag(nextState);
    };

    const clearDrag = (commit: boolean) => {
      const finished = activeDragRef.current;
      pendingDragRef.current = null;
      activeDragRef.current = null;
      setActiveDrag(null);

      if (justDraggedRef.current) {
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }

      if (commit && finished) {
        const { sourceSlot, alignment } = finished;
        const target = alignment.targetSlot;
        if (target && target.slotIndex !== sourceSlot.slotIndex) {
          if (target.image) {
            if (target.imageQueueIndex !== sourceSlot.imageQueueIndex) {
              onReorderImages(sourceSlot.imageQueueIndex, target.imageQueueIndex);
            }
          } else if (imageCount > 1 && sourceSlot.imageQueueIndex !== imageCount - 1) {
            onReorderImages(sourceSlot.imageQueueIndex, imageCount - 1);
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pendingDragRef.current || e.pointerId !== pendingDragRef.current.pointerId) return;
      clearDrag(true);
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (!pendingDragRef.current || e.pointerId !== pendingDragRef.current.pointerId) return;
      clearDrag(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDragRef.current) {
        e.stopPropagation();
        clearDrag(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [geometry, currentPage.slots, imageCount, onReorderImages]);

  const handleFileDragOver = (e: React.DragEvent) => {
    if (activeDrag) return;
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsFileDragOver(true);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    setIsFileDragOver(false);
    if (activeDrag) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      onFilesDropped(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="relative flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden"
      onDragOver={handleFileDragOver}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsFileDragOver(false);
      }}
      onDrop={handleFileDrop}
    >
      {/* Live Preview Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2.5 shrink-0">
        {/* Clean Plain-English Summary (Simple mode) or Detailed Specs (Advanced mode) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-600">
          <span className="font-medium text-zinc-900">
            {paperLabel} {settings.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
          </span>
          {geometry.bleedMm > 0 && (
            <>
              <span className="text-zinc-300" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums font-medium text-rose-700">
                +{formatLength(geometry.bleedMm, settings.unit)} bleed
              </span>
            </>
          )}
          <span className="text-zinc-300" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-zinc-700">
            {geometry.columns}×{geometry.rows} ({geometry.slotsPerPage} per page)
          </span>
          {!settings.beginnerMode ? (
            <>
              <span className="text-zinc-300" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-zinc-600">
                Trim {formatDimensions(geometry.cellWidthMm, geometry.cellHeightMm, settings.unit)}
              </span>
              <span className="text-zinc-300 hidden xl:inline" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-zinc-600 hidden xl:inline">
                {geometry.targetPagePxW}×{geometry.targetPagePxH} px @ {settings.dpi} DPI
              </span>
            </>
          ) : (
            <>
              <span className="text-zinc-300 hidden sm:inline" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-zinc-600 hidden sm:inline">
                {settings.dpi} DPI print quality
              </span>
            </>
          )}
          {lowResCount > 0 && (
            <>
              <span className="text-zinc-300" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {lowResCount} {lowResCount === 1 ? 'photo may print soft' : 'photos may print soft'}
              </span>
            </>
          )}
        </div>

        {/* Interactive Preview Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Forgiving Undo Button */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo last change (Ctrl+Z)"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {/* Beginner Help Guide Button */}
          <button
            type="button"
            onClick={onOpenHelp}
            title="Quick 3-step beginner guide"
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Toggleable Keyboard Shortcuts Overlay Button */}
          <button
            type="button"
            onClick={onToggleShortcuts}
            aria-pressed={shortcutsOpen}
            title="Keyboard shortcuts (?)"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              shortcutsOpen
                ? 'border-blue-500 bg-blue-50/70 text-blue-700'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Shortcuts</span>
          </button>

          {/* Rulers & Resolution Specs toggles */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => onToggleSetting('showRulers')}
              title="Toggle print rulers"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.showRulers
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Rulers</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleSetting('showResolutionOverlay')}
              title="Inspect live effective print DPI & pixel resolution on each box"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.showResolutionOverlay
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">DPI Specs</span>
            </button>
          </div>

          {/* Zoom Controls (Single Sheet View) */}
          {viewMode === 'single' && (
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.15)}
                aria-label="Zoom out"
                className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-l-lg transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                title="Fit sheet to screen"
                className={`px-2 py-1 font-mono text-[11px] tabular-nums border-x border-zinc-200 transition-colors whitespace-nowrap cursor-pointer ${
                  zoomMode === 'fit'
                    ? 'bg-zinc-50 font-semibold text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {zoomMode === 'fit' ? 'Fit' : `${sheetDimensionsPx.effectiveZoomPercent}%`}
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(0.15)}
                aria-label="Zoom in"
                className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-r-lg transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Page Switcher */}
          {pages.length > 1 && viewMode === 'single' && (
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white">
              <button
                type="button"
                disabled={safePageIndex === 0}
                onClick={() => onSelectPage(Math.max(0, safePageIndex - 1))}
                aria-label="Previous page"
                className="p-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-35 rounded-l-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] tabular-nums text-zinc-800 whitespace-nowrap">
                {safePageIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                disabled={safePageIndex >= pages.length - 1}
                onClick={() => onSelectPage(Math.min(pages.length - 1, safePageIndex + 1))}
                aria-label="Next page"
                className="p-1.5 text-zinc-600 hover:text-zinc-900 disabled:opacity-35 rounded-r-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Drafting Mat Viewport */}
      <div
        ref={viewportRef}
        onClick={() => {
          if (justDraggedRef.current) return;
          onSelectImage(null);
        }}
        className="drafting-mat relative flex-1 overflow-auto studio-scroll"
      >
        {isFileDragOver && (
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-blue-600/10 backdrop-blur-[1px]">
            <div className="rounded-xl border-2 border-dashed border-blue-600 bg-white/95 px-8 py-6 text-center shadow-xl">
              <ImagePlus className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-2 text-sm font-semibold text-zinc-900">Drop your photos anywhere</p>
              <p className="mt-0.5 text-xs text-zinc-600">Processed privately &amp; offline on your device</p>
            </div>
          </div>
        )}

        {viewMode === 'single' ? (
          <div className="flex min-h-full min-w-full flex-col items-center justify-center p-8 sm:p-12">
            <div className="relative">
              {showRulersNow && (
                <SheetRulers
                  widthPx={sheetDimensionsPx.width}
                  heightPx={sheetDimensionsPx.height}
                  geometry={geometry}
                  unit={settings.unit}
                />
              )}

              <div
                ref={sheetRef}
                style={{
                  width: `${sheetDimensionsPx.width}px`,
                  height: `${sheetDimensionsPx.height}px`,
                  backgroundColor: settings.paperColor || '#FFFFFF',
                }}
                className="relative shadow-[0_12px_38px_-10px_rgba(24,24,27,0.22),0_2px_8px_rgba(24,24,27,0.08)] ring-1 ring-zinc-900/10 transition-[width,height] duration-150"
              >
                {/* Trim Edge Perimeter Boundary when Print Bleed is enabled */}
                {geometry.bleedMm > 0 && (
                  <div
                    style={{
                      left: `${(geometry.bleedMm / geometry.pageWidthMm) * 100}%`,
                      top: `${(geometry.bleedMm / geometry.pageHeightMm) * 100}%`,
                      width: `${(geometry.trimPageWidthMm / geometry.pageWidthMm) * 100}%`,
                      height: `${(geometry.trimPageHeightMm / geometry.pageHeightMm) * 100}%`,
                    }}
                    className="pointer-events-none absolute z-20 border border-dashed border-rose-400/80"
                  >
                    <span className="absolute -top-4 left-0 font-mono text-[9px] font-medium tabular-nums text-rose-600 whitespace-nowrap">
                      Trim Edge · +{formatLength(geometry.bleedMm, settings.unit)} bleed
                    </span>
                  </div>
                )}

                {settings.marginMm > 0 && (
                  <div
                    style={{
                      left: `${((geometry.bleedMm + geometry.marginMm) / geometry.pageWidthMm) * 100}%`,
                      top: `${((geometry.bleedMm + geometry.marginMm) / geometry.pageHeightMm) * 100}%`,
                      width: `${(geometry.printableWidthMm / geometry.pageWidthMm) * 100}%`,
                      height: `${(geometry.printableHeightMm / geometry.pageHeightMm) * 100}%`,
                    }}
                    className="pointer-events-none absolute border border-dotted border-zinc-300/60"
                  />
                )}

                {currentPage.slots.map((slot) => {
                  const isSource =
                    activeDrag !== null && activeDrag.sourceSlot.slotIndex === slot.slotIndex;
                  const targetSlot = activeDrag?.alignment.targetSlot ?? null;
                  const isTarget =
                    activeDrag !== null &&
                    targetSlot !== null &&
                    targetSlot.slotIndex === slot.slotIndex &&
                    targetSlot.slotIndex !== activeDrag.sourceSlot.slotIndex;

                  return (
                    <SheetSlotView
                      key={slot.slotIndex}
                      slot={slot}
                      geometry={geometry}
                      settings={settings}
                      isSelected={slot.image?.id === selectedImageId}
                      isDragSource={isSource}
                      isDragTarget={isTarget}
                      isCanvasDragging={activeDrag !== null}
                      justDraggedRef={justDraggedRef}
                      onSelectImage={onSelectImage}
                      onRotateImage={onRotateImage}
                      onIncrementCopy={onIncrementCopy}
                      onRemoveImage={onRemoveImage}
                      onOpenFilePicker={onOpenFilePicker}
                      onPointerDownSlot={handlePointerDownSlot}
                    />
                  );
                })}

                <SheetGuidesOverlay
                  slots={currentPage.slots}
                  geometry={geometry}
                  settings={settings}
                />

                {/* Live Floating Preview Tile & Horizontal/Vertical Centering Guides */}
                {activeDrag && (
                  <>
                    <FloatingDraggedTile
                      slot={activeDrag.sourceSlot}
                      geometry={geometry}
                      settings={settings}
                      centerXMm={activeDrag.alignment.snappedCenterXMm}
                      centerYMm={activeDrag.alignment.snappedCenterYMm}
                      isSnappedToCenter={activeDrag.alignment.isCenteredBothPageAxes}
                    />
                    <AlignmentGuidesOverlay
                      geometry={geometry}
                      alignment={activeDrag.alignment}
                    />
                  </>
                )}

                {/* Beginner-Friendly Goal-Based Empty State */}
                {!hasImages && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                    <div className="pointer-events-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white/95 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
                      <div className="text-center">
                        <h2 className="text-base font-semibold text-zinc-900">
                          What would you like to print today?
                        </h2>
                        <p className="mt-1 text-xs text-zinc-600">
                          Pick a quick start below—we’ll set up the grid for you automatically.
                        </p>
                      </div>

                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => onQuickStartGoal('repeatOne')}
                          className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Copy className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900">
                              Repeat 1 Photo Across the Page
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              Stickers, labels, ID / passport photos (auto-fills 3×3)
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickStartGoal('multiPhoto')}
                          className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                            <Images className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900">
                              Fit Many Different Photos on One Page
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              Photo sheets, flashcards, or scrapbooking (2×2 or custom)
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickStartGoal('cards')}
                          className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-colors cursor-pointer"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900">
                              Business Cards or Wallet Prints
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              10 per page with crisp scissors crop marks
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">
                          Just exploring? Try sample art:
                        </span>
                        <button
                          type="button"
                          onClick={onLoadSamples}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Load Sample Prints
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Clean bottom sheet caption & live drag alignment readout */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[11px] text-zinc-500">
                {activeDrag ? (
                  <>
                    <div className="font-mono tabular-nums text-zinc-800">
                      Center {formatLength(activeDrag.alignment.snappedCenterXMm, settings.unit)} × {formatLength(activeDrag.alignment.snappedCenterYMm, settings.unit)}
                      {(activeDrag.alignment.verticalGuide || activeDrag.alignment.horizontalGuide) && (
                        <span className="text-rose-600 font-medium">
                          {' · '}
                          {[
                            activeDrag.alignment.verticalGuide?.label,
                            activeDrag.alignment.horizontalGuide?.label,
                          ]
                            .filter(Boolean)
                            .join(' & ')}
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500">
                      Release over a box to place · Esc to cancel
                    </span>
                  </>
                ) : (
                  <>
                    <div className="font-mono tabular-nums">
                      Page {safePageIndex + 1} of {pages.length} · {currentPage.filledCount}/{geometry.slotsPerPage} filled · {formatLength(geometry.pageWidthMm, settings.unit)} × {formatLength(geometry.pageHeightMm, settings.unit)}
                    </div>
                    {hasImages && (
                      <div className="flex items-center gap-3">
                        <span>Drag any photo to align &amp; place · Hover to rotate</span>
                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onSwitchViewMode('all')}
                            className="inline-flex items-center gap-1 font-medium text-zinc-800 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            View all {pages.length} pages
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  All Sheets Overview
                </h2>
                <p className="text-xs text-zinc-600 font-mono tabular-nums mt-0.5">
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'} · {totalPlacedImages} total placed {totalPlacedImages === 1 ? 'photo' : 'photos'} · {settings.dpi} DPI export target
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSwitchViewMode('single')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Back to Single Sheet
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {pages.map((page) => {
                const isActive = page.pageIndex === safePageIndex;
                return (
                  <div
                    key={page.pageIndex}
                    onClick={() => {
                      onSelectPage(page.pageIndex);
                      onSwitchViewMode('single');
                    }}
                    className="group cursor-pointer flex flex-col"
                  >
                    <div
                      style={{
                        aspectRatio: `${geometry.pageWidthMm} / ${geometry.pageHeightMm}`,
                        backgroundColor: settings.paperColor || '#FFFFFF',
                      }}
                      className={`relative w-full overflow-hidden shadow-md transition-transform duration-150 group-hover:-translate-y-0.5 ${
                        isActive
                          ? 'ring-2 ring-blue-600'
                          : 'ring-1 ring-zinc-900/10 group-hover:ring-zinc-400'
                      }`}
                    >
                      {geometry.bleedMm > 0 && (
                        <div
                          style={{
                            left: `${(geometry.bleedMm / geometry.pageWidthMm) * 100}%`,
                            top: `${(geometry.bleedMm / geometry.pageHeightMm) * 100}%`,
                            width: `${(geometry.trimPageWidthMm / geometry.pageWidthMm) * 100}%`,
                            height: `${(geometry.trimPageHeightMm / geometry.pageHeightMm) * 100}%`,
                          }}
                          className="pointer-events-none absolute z-20 border border-dashed border-rose-400/75"
                        />
                      )}
                      {page.slots.map((slot) => (
                        <SheetSlotView
                          key={slot.slotIndex}
                          slot={slot}
                          geometry={geometry}
                          settings={settings}
                          isSelected={false}
                          isDragSource={false}
                          isDragTarget={false}
                          isCanvasDragging={false}
                          compact
                          onSelectImage={() => {}}
                          onRotateImage={() => {}}
                          onIncrementCopy={() => {}}
                          onRemoveImage={() => {}}
                          onOpenFilePicker={() => {}}
                          onPointerDownSlot={() => {}}
                        />
                      ))}
                      <SheetGuidesOverlay
                        slots={page.slots}
                        geometry={geometry}
                        settings={settings}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">
                        Page {page.pageIndex + 1}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                        {page.filledCount} / {geometry.slotsPerPage} filled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
