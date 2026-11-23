import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  FileDown,
  FolderOpen,
  GripVertical,
  HardDriveDownload,
  ImagePlus,
  Layers,
  LayoutGrid,
  Minus,
  Plus,
  RotateCw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  ExportDpi,
  FitMode,
  GridPreset,
  GridSuggestion,
  GuideStyle,
  ImageFilter,
  LayoutSettings,
  PaperSizeKey,
  SheetGeometry,
  SheetImage,
} from '../types/sheet';
import {
  analyzeOptimalGrid,
  formatDimensions,
  getImageCssFilter,
  GRID_PRESETS,
  IMAGE_FILTER_OPTIONS,
  PAPER_DEFINITIONS,
} from '../utils/layoutEngine';

export type SidebarTab = 'images' | 'layout' | 'print';

interface SidebarControlsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  images: SheetImage[];
  settings: LayoutSettings;
  geometry: SheetGeometry;
  selectedImageId: string | null;
  isExporting: boolean;
  onSelectImage: (id: string | null) => void;
  onOpenFilePicker: () => void;
  onLoadSamples: () => void;
  onUpdateImageCopies: (id: string, copies: number) => void;
  onUpdateImageFilter: (id: string, filter: ImageFilter) => void;
  onSetAllCopies: (copies: number) => void;
  onRotateImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onClearAllImages: () => void;
  onReorderImages: (fromIndex: number, toIndex: number) => void;
  onUpdateSettings: (patch: Partial<LayoutSettings>) => void;
  onApplyPreset: (preset: GridPreset) => void;
  onApplyGridSuggestion: (suggestion: GridSuggestion) => void;
  onAutoOrientAllImages: () => void;
  onDownloadProject: () => void;
  onOpenProjectPicker: () => void;
  onExportPdf: () => void;
}

const PAPER_SWATCHES = [
  { label: 'Pure White', color: '#FFFFFF' },
  { label: 'Warm Archival', color: '#FAF8F5' },
  { label: 'Soft Gray', color: '#F4F4F5' },
  { label: 'Matte Black', color: '#18181B' },
];

const GUIDE_SWATCHES = [
  { label: 'Medium Gray', color: '#71717A' },
  { label: 'Black Ink', color: '#18181B' },
  { label: 'Cyan Registration', color: '#0284C7' },
  { label: 'Light Silver', color: '#A1A1AA' },
];

const SPACING_PRESETS = [
  { id: 'tight', label: 'No Gaps', marginMm: 4, gapMm: 0 },
  { id: 'balanced', label: 'Balanced', marginMm: 10, gapMm: 5 },
  { id: 'roomy', label: 'Roomy', marginMm: 16, gapMm: 10 },
];

/** Visual mini paper grid icon so beginners immediately see what 2×2, 3×3, 2×5, etc. look like */
const MiniGridDiagram: React.FC<{ cols: number; rows: number; active: boolean }> = ({
  cols,
  rows,
  active,
}) => {
  const displayCols = Math.min(cols, 4);
  const displayRows = Math.min(rows, 5);
  const w = 26;
  const h = 34;
  const pad = 3;
  const gap = 1.5;
  const cellW = (w - pad * 2 - gap * (displayCols - 1)) / displayCols;
  const cellH = (h - pad * 2 - gap * (displayRows - 1)) / displayRows;

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < displayRows; r++) {
    for (let c = 0; c < displayCols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={pad + c * (cellW + gap)}
          y={pad + r * (cellH + gap)}
          width={cellW}
          height={cellH}
          rx={0.8}
          fill={active ? '#2563EB' : '#A1A1AA'}
          fillOpacity={active ? 0.85 : 0.55}
        />
      );
    }
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 rounded-[3px] border border-zinc-200 bg-white shadow-2xs"
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
};

/** Visual mini cut-guide preview icon so beginners know what Crop Marks vs Dashed Lines look like */
const MiniGuideIcon: React.FC<{ style: GuideStyle; active: boolean }> = ({ style, active }) => {
  const stroke = active ? '#2563EB' : '#71717A';
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0" aria-hidden="true">
      <rect x="5" y="5" width="16" height="16" rx="1" fill="#F4F4F5" />
      {style === 'solidBorder' && (
        <rect x="5" y="5" width="16" height="16" fill="none" stroke={stroke} strokeWidth="1.2" />
      )}
      {style === 'dashedLines' && (
        <rect
          x="5"
          y="5"
          width="16"
          height="16"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          strokeDasharray="2.5 2"
        />
      )}
      {style === 'cropMarks' && (
        <g stroke={stroke} strokeWidth="1.3" strokeLinecap="square">
          <line x1="1.5" y1="5" x2="4" y2="5" />
          <line x1="5" y1="1.5" x2="5" y2="4" />
          <line x1="22" y1="5" x2="24.5" y2="5" />
          <line x1="21" y1="1.5" x2="21" y2="4" />
          <line x1="1.5" y1="21" x2="4" y2="21" />
          <line x1="5" y1="22" x2="5" y2="24.5" />
          <line x1="22" y1="21" x2="24.5" y2="21" />
          <line x1="21" y1="22" x2="21" y2="24.5" />
        </g>
      )}
    </svg>
  );
};

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  activeTab,
  onTabChange,
  images,
  settings,
  geometry,
  selectedImageId,
  isExporting,
  onSelectImage,
  onOpenFilePicker,
  onLoadSamples,
  onUpdateImageCopies,
  onUpdateImageFilter,
  onSetAllCopies,
  onRotateImage,
  onRemoveImage,
  onClearAllImages,
  onReorderImages,
  onUpdateSettings,
  onApplyPreset,
  onApplyGridSuggestion,
  onAutoOrientAllImages,
  onDownloadProject,
  onOpenProjectPicker,
  onExportPdf,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [gridSuggestion, setGridSuggestion] = useState<GridSuggestion | null>(null);

  const isSimple = settings.beginnerMode;
  const totalCopies = images.reduce((sum, img) => sum + img.copies, 0);

  const handleAnalyzeBestGrid = () => {
    const result = analyzeOptimalGrid(images, settings);
    setGridSuggestion(result);
  };

  const slotIsLandscape = geometry.cellWidthMm > geometry.cellHeightMm + 0.5;
  const slotIsPortrait = geometry.cellHeightMm > geometry.cellWidthMm + 0.5;
  const slotOrientationLabel = slotIsLandscape
    ? 'Landscape'
    : slotIsPortrait
      ? 'Portrait'
      : 'Square';

  const rotatableCount = images.reduce((count, img) => {
    if (!slotIsLandscape && !slotIsPortrait) return count;
    const swapped = img.rotation === 90 || img.rotation === 270;
    const curW = swapped ? img.naturalHeight : img.naturalWidth;
    const curH = swapped ? img.naturalWidth : img.naturalHeight;
    const imgIsLandscape = curW > curH * 1.02;
    const imgIsPortrait = curH > curW * 1.02;
    if ((slotIsLandscape && imgIsPortrait) || (slotIsPortrait && imgIsLandscape)) {
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <aside className="flex h-full w-full flex-col bg-white border-r border-zinc-200 select-none">
      {/* 3-Step Guided Tabs + Simple / Advanced Switch */}
      <div className="border-b border-zinc-200 p-3 space-y-2.5 shrink-0">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => onTabChange('images')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'images'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>1. Photos</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('layout')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'layout'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>2. Layout</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('print')}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'print'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span>3. Print</span>
          </button>
        </div>

        {/* Simple vs Advanced Controls Toggle */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] text-zinc-500">
            {isSimple ? 'Easy beginner view' : 'All pro controls shown'}
          </span>
          <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onUpdateSettings({ beginnerMode: true })}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer whitespace-nowrap ${
                isSimple ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ beginnerMode: false })}
              className={`rounded px-2 py-0.5 transition-colors cursor-pointer whitespace-nowrap ${
                !isSimple ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Tab Body */}
      <div className="flex-1 overflow-y-auto studio-scroll p-4 space-y-6">
        {/* ================= STEP 1: PHOTOS & REPETITION ================= */}
        {activeTab === 'images' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xs font-semibold text-zinc-900">Step 1: Add Your Photos</h2>
                {images.length > 0 && (
                  <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                    {images.length} {images.length === 1 ? 'photo' : 'photos'}
                    {settings.repeatBehavior === 'perImage' ? ` · ${totalCopies} on sheet` : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">
                Pick one photo to repeat across the page, or pick several to place together.
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={onOpenFilePicker}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 px-4 py-3.5 text-xs font-semibold text-blue-700 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4 shrink-0" />
                  <span>{images.length === 0 ? 'Upload Photos from Device' : 'Add More Photos'}</span>
                </button>

                {images.length === 0 && (
                  <button
                    type="button"
                    onClick={onLoadSamples}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Try With 3 Sample Prints</span>
                  </button>
                )}
              </div>
            </div>

            {/* Plain-English Repeat Behavior */}
            <div className="border-t border-zinc-100 pt-5">
              <h2 className="text-xs font-semibold text-zinc-900 mb-2">
                How should photos repeat?
              </h2>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ repeatBehavior: 'fillPage' })}
                  className={`flex items-start justify-between gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                    settings.repeatBehavior === 'fillPage'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">
                      Fill the whole page automatically
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      Repeats your photo(s) to fill all {geometry.slotsPerPage} boxes on the sheet.
                    </div>
                  </div>
                  {settings.repeatBehavior === 'fillPage' && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ repeatBehavior: 'perImage' })}
                  className={`flex items-start justify-between gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                    settings.repeatBehavior === 'perImage'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-900">
                      Choose exact copies for each photo
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      Pick how many times each photo appears (adds extra pages automatically).
                    </div>
                  </div>
                  {settings.repeatBehavior === 'perImage' && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                </button>
              </div>

              {/* Quick Repeat All Buttons */}
              {images.length > 0 && settings.repeatBehavior === 'perImage' && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-600">Repeat every photo:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 4, geometry.slotsPerPage].map((count, i) => (
                      <button
                        key={`${count}-${i}`}
                        type="button"
                        onClick={() => onSetAllCopies(count)}
                        className="rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-[11px] tabular-nums text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                      >
                        {i === 3 ? `Fill (${count})` : `×${count}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Uploaded Photos List */}
            {images.length > 0 && (
              <div className="border-t border-zinc-100 pt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-semibold text-zinc-900">
                    Your Photos <span className="font-normal text-zinc-500">(drag to reorder)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={onClearAllImages}
                    className="text-[11px] font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Remove all
                  </button>
                </div>

                {/* One-Click Auto-Rotate All to Maximize Slot Space */}
                <button
                  type="button"
                  onClick={onAutoOrientAllImages}
                  className="mb-3 w-full flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:border-blue-500 hover:bg-blue-50/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-zinc-900 truncate">
                        Auto-Rotate All to {slotOrientationLabel}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {!slotIsLandscape && !slotIsPortrait
                          ? 'Slots are square — any orientation fits equally'
                          : rotatableCount > 0
                            ? `Matches ${rotatableCount} ${rotatableCount === 1 ? 'photo' : 'photos'} to slot shape`
                            : 'All photos already match slot shape'}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="space-y-2">
                  {images.map((img, index) => {
                    const isSelected = img.id === selectedImageId;
                    const isDropHighlight =
                      dragOverIndex === index && dragIndex !== null && dragIndex !== index;

                    return (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDragIndex(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIndex(index);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragIndex !== null && dragIndex !== index) {
                            onReorderImages(dragIndex, index);
                          }
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => {
                          setDragIndex(null);
                          setDragOverIndex(null);
                        }}
                        onClick={() => onSelectImage(img.id)}
                        className={`rounded-lg border p-2.5 transition-colors cursor-pointer ${
                          isDropHighlight
                            ? 'border-blue-500 bg-blue-50/40'
                            : isSelected
                              ? 'border-blue-500/80 bg-blue-50/20'
                              : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <GripVertical className="w-3.5 h-3.5 text-zinc-400 shrink-0 cursor-grab" />
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              referrerPolicy="no-referrer"
                              style={{
                                transform: `rotate(${img.rotation}deg)`,
                                filter: getImageCssFilter(img.filter),
                              }}
                              className="h-full w-full object-cover transition-transform duration-150"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-zinc-900">
                              {img.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
                              {img.naturalWidth}×{img.naturalHeight} px
                              {img.rotation !== 0 ? ` · ${img.rotation}°` : ''}
                              {img.filter && img.filter !== 'none'
                                ? ` · ${IMAGE_FILTER_OPTIONS.find((f) => f.key === img.filter)?.label || img.filter}`
                                : ''}
                            </p>
                          </div>
                        </div>

                        {/* Individual Photo Filter Strip */}
                        <div
                          className="mt-2.5 grid grid-cols-4 gap-1 rounded-md bg-zinc-100 p-0.5"
                          onClick={(e) => e.stopPropagation()}
                          role="group"
                          aria-label={`Color filter for ${img.name}`}
                        >
                          {IMAGE_FILTER_OPTIONS.map((opt) => {
                            const activeFilter = img.filter || 'none';
                            const isActive = activeFilter === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => onUpdateImageFilter(img.id, opt.key)}
                                className={`rounded px-1.5 py-1 text-[10px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                  isActive
                                    ? 'bg-white text-zinc-900 shadow-2xs'
                                    : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                          {settings.repeatBehavior === 'perImage' ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[11px] text-zinc-500 mr-1">Copies</span>
                              <button
                                type="button"
                                aria-label="Decrease copies"
                                onClick={() => onUpdateImageCopies(img.id, Math.max(1, img.copies - 1))}
                                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                aria-label={`Copies of ${img.name}`}
                                value={img.copies}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(val)) {
                                    onUpdateImageCopies(img.id, Math.max(1, Math.min(200, val)));
                                  }
                                }}
                                className="h-7 w-11 rounded border border-zinc-200 text-center font-mono text-xs tabular-nums text-zinc-900 focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                aria-label="Increase copies"
                                onClick={() => onUpdateImageCopies(img.id, Math.min(200, img.copies + 1))}
                                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Auto-repeated on page</span>
                          )}

                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={index === 0}
                              title="Move earlier"
                              onClick={() => onReorderImages(index, index - 1)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === images.length - 1}
                              title="Move later"
                              onClick={() => onReorderImages(index, index + 1)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Rotate 90°"
                              onClick={() => onRotateImage(img.id)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove photo"
                              onClick={() => onRemoveImage(img.id)}
                              className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= STEP 2: VISUAL GRID & PAPER LAYOUT ================= */}
        {activeTab === 'layout' && (
          <>
            {/* Smart Aspect-Ratio Grid Suggestion */}
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 mb-1">
                Step 2: Pick How Many Fit on a Page
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                Let SheetPress analyze your photo shapes, or tap a preset below.
              </p>

              <button
                type="button"
                disabled={images.length === 0}
                onClick={handleAnalyzeBestGrid}
                className="mb-3 w-full flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-50 disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Suggest Best Grid for My Photos</span>
              </button>

              {gridSuggestion && images.length > 0 && (
                <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <MiniGridDiagram
                      cols={gridSuggestion.columns}
                      rows={gridSuggestion.rows}
                      active
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-900">
                          {gridSuggestion.isAlreadyOptimal
                            ? `Current ${gridSuggestion.columns}×${gridSuggestion.rows} is already optimal`
                            : `Suggested: ${gridSuggestion.columns}×${gridSuggestion.rows} (${gridSuggestion.columns * gridSuggestion.rows}/page)`}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-700">
                        {gridSuggestion.efficiencyPercent}% space used
                        {!gridSuggestion.isAlreadyOptimal && gridSuggestion.improvementPercent > 0
                          ? ` · +${gridSuggestion.improvementPercent}% vs now`
                          : ''}
                        {gridSuggestion.orientation !== settings.orientation
                          ? ` · ${gridSuggestion.orientation === 'landscape' ? 'Landscape' : 'Portrait'}`
                          : ''}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-zinc-600">
                        {gridSuggestion.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {!gridSuggestion.isAlreadyOptimal && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyGridSuggestion(gridSuggestion);
                          setGridSuggestion(null);
                        }}
                        className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Apply {gridSuggestion.columns}×{gridSuggestion.rows} Grid
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setGridSuggestion(null)}
                      className={`${
                        gridSuggestion.isAlreadyOptimal ? 'w-full' : ''
                      } rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer whitespace-nowrap`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {GRID_PRESETS.map((preset) => {
                  const isActive =
                    settings.columns === preset.columns && settings.rows === preset.rows;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyPreset(preset)}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/50 text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <MiniGridDiagram
                        cols={preset.columns}
                        rows={preset.rows}
                        active={isActive}
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-zinc-900 truncate">
                          {preset.name}
                        </span>
                        <span className="block text-[10px] font-mono tabular-nums text-zinc-500">
                          {preset.columns * preset.rows} per page
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columns & Rows Steppers */}
            <div className="border-t border-zinc-100 pt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold text-zinc-900">Custom Grid Size</h2>
                <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                  {geometry.slotsPerPage} per page
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">
                    Across (Columns)
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ columns: Math.max(1, settings.columns - 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      aria-label="Decrease columns"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
                      {settings.columns}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ columns: Math.min(12, settings.columns + 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      aria-label="Increase columns"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1.5">
                    Down (Rows)
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ rows: Math.max(1, settings.rows - 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      aria-label="Decrease rows"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900">
                      {settings.rows}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ rows: Math.min(16, settings.rows + 1) })}
                      className="flex h-7 w-7 items-center justify-center rounded text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                      aria-label="Increase rows"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Paper Size & Direction */}
            <div className="border-t border-zinc-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-zinc-900">Paper Size &amp; Direction</h2>
                {!isSimple && (
                  <div className="flex items-center rounded-md bg-zinc-100 p-0.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ unit: 'mm' })}
                      className={`rounded px-2 py-0.5 cursor-pointer ${
                        settings.unit === 'mm' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
                      }`}
                    >
                      mm
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ unit: 'in' })}
                      className={`rounded px-2 py-0.5 cursor-pointer ${
                        settings.unit === 'in' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500'
                      }`}
                    >
                      in
                    </button>
                  </div>
                )}
              </div>

              {isSimple ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { key: 'a4', label: 'A4 Paper', sub: 'Standard international' },
                      { key: 'letter', label: 'US Letter', sub: '8.5 × 11 inches' },
                      { key: 'photo4x6', label: '4×6 Photo', sub: 'Small photo paper' },
                      { key: 'a3', label: 'A3 Large', sub: 'Poster / big sheet' },
                    ] as { key: PaperSizeKey; label: string; sub: string }[]
                  ).map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onUpdateSettings({ paperSize: p.key })}
                      className={`rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                        settings.paperSize === p.key
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-semibold text-zinc-900">{p.label}</div>
                      <div className="text-[10px] text-zinc-500">{p.sub}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <select
                    value={settings.paperSize}
                    onChange={(e) => onUpdateSettings({ paperSize: e.target.value as PaperSizeKey })}
                    aria-label="Paper size"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 focus:border-blue-500 focus:outline-none"
                  >
                    {Object.values(PAPER_DEFINITIONS).map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label} ({p.subtitle})
                      </option>
                    ))}
                  </select>

                  {settings.paperSize === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-zinc-500 mb-1">Width (mm)</label>
                        <input
                          type="number"
                          min={50}
                          max={1000}
                          value={settings.customWidthMm}
                          onChange={(e) =>
                            onUpdateSettings({
                              customWidthMm: Math.max(50, Math.min(1000, Number(e.target.value) || 210)),
                            })
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-500 mb-1">Height (mm)</label>
                        <input
                          type="number"
                          min={50}
                          max={1000}
                          value={settings.customHeightMm}
                          onChange={(e) =>
                            onUpdateSettings({
                              customHeightMm: Math.max(50, Math.min(1000, Number(e.target.value) || 297)),
                            })
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ orientation: 'portrait' })}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {isSimple ? 'Vertical (Tall)' : 'Portrait'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ orientation: 'landscape' })}
                  className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {isSimple ? 'Horizontal (Wide)' : 'Landscape'}
                </button>
              </div>
            </div>

            {/* Spacing: Simple 3-choice buttons OR Advanced mm sliders */}
            <div className="border-t border-zinc-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-zinc-900">Spacing &amp; Margins</h2>
                {!isSimple && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ marginMm: 0, gapMm: 0 })}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Edge-to-edge
                  </button>
                )}
              </div>

              {isSimple ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {SPACING_PRESETS.map((sp) => {
                    const isActive =
                      settings.marginMm === sp.marginMm && settings.gapMm === sp.gapMm;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ marginMm: sp.marginMm, gapMm: sp.gapMm })
                        }
                        className={`rounded-lg border py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'border-blue-600 bg-blue-50/50 text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-zinc-600">Page Margin</span>
                      <span className="font-mono tabular-nums text-zinc-900">{settings.marginMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={settings.marginMm}
                      onChange={(e) => onUpdateSettings({ marginMm: Number(e.target.value) })}
                      className="studio-slider w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-zinc-600">Gap Between Photos</span>
                      <span className="font-mono tabular-nums text-zinc-900">{settings.gapMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      step={1}
                      value={settings.gapMm}
                      onChange={(e) => onUpdateSettings({ gapMm: Number(e.target.value) })}
                      className="studio-slider w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Photo Framing inside each box */}
            <div className="border-t border-zinc-100 pt-5 space-y-3">
              <h2 className="text-xs font-semibold text-zinc-900">How Photos Fit Each Box</h2>
              {isSimple ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fitMode: 'cover' })}
                    className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                      settings.fitMode === 'cover'
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-900">Fill Box</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      Clean edge-to-edge tiles (no blank bands)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fitMode: 'contain' })}
                    className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                      settings.fitMode === 'contain'
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-900">Show Whole Photo</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      Nothing cropped—keeps entire image visible
                    </div>
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
                    {(
                      [
                        { key: 'cover', label: 'Fill' },
                        { key: 'contain', label: 'Fit Whole' },
                        { key: 'stretch', label: 'Stretch' },
                      ] as { key: FitMode; label: string }[]
                    ).map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => onUpdateSettings({ fitMode: mode.key })}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          settings.fitMode === mode.key
                            ? 'bg-white text-zinc-900 shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {settings.fitMode === 'cover' && 'Fills each slot cleanly with no empty bands (edges gently trimmed).'}
                    {settings.fitMode === 'contain' && 'Shows 100% of every image without cropping any edges.'}
                    {settings.fitMode === 'stretch' && 'Stretches each image to match exact slot height and width.'}
                  </p>
                </>
              )}

              <button
                type="button"
                disabled={images.length === 0}
                onClick={onAutoOrientAllImages}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:border-blue-500 hover:bg-blue-50/40 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="whitespace-nowrap">
                  Rotate All to Fit {slotOrientationLabel} Slots
                </span>
              </button>
              <p className="text-[11px] text-zinc-500">
                {images.length === 0
                  ? `Slots are currently ${slotOrientationLabel.toLowerCase()} (${formatDimensions(geometry.cellWidthMm, geometry.cellHeightMm, settings.unit)}).`
                  : !slotIsLandscape && !slotIsPortrait
                    ? 'Current grid slots are square—no rotation needed.'
                    : rotatableCount > 0
                      ? `Rotates ${rotatableCount} of ${images.length} ${images.length === 1 ? 'photo' : 'photos'} to maximize space inside each ${slotOrientationLabel.toLowerCase()} box.`
                      : `All ${images.length} ${images.length === 1 ? 'photo already matches' : 'photos already match'} the ${slotOrientationLabel.toLowerCase()} slot orientation.`}
              </p>

              <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
                <div>
                  <span className="block text-xs font-medium text-zinc-800">
                    Keep Auto-Turning on Grid Changes
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    Automatically turns photos whenever you resize the grid
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoRotate}
                  onChange={(e) => onUpdateSettings({ autoRotate: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            </div>
          </>
        )}

        {/* ================= STEP 3: CUT LINES & HIGH-RES PDF ================= */}
        {activeTab === 'print' && (
          <>
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 mb-1">
                Step 3: Add Scissors Cut Guides
              </h2>
              <p className="text-[11px] text-zinc-500 mb-3">
                Optional light lines that make cutting your printed sheet fast and straight.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'none', label: 'No Lines' },
                    { key: 'cropMarks', label: 'Corner Marks' },
                    { key: 'dashedLines', label: 'Dashed Cut' },
                    { key: 'solidBorder', label: 'Thin Border' },
                  ] as { key: GuideStyle; label: string }[]
                ).map((g) => {
                  const active = settings.guideStyle === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => onUpdateSettings({ guideStyle: g.key })}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-50/50 text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <MiniGuideIcon style={g.key} active={active} />
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>

              {!isSimple && settings.guideStyle !== 'none' && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600">Guide Ink Color</span>
                  <div className="flex items-center gap-1.5">
                    {GUIDE_SWATCHES.map((s) => (
                      <button
                        key={s.color}
                        type="button"
                        title={s.label}
                        onClick={() => onUpdateSettings({ guideColor: s.color })}
                        style={{ backgroundColor: s.color }}
                        className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${
                          settings.guideColor === s.color
                            ? 'scale-110 ring-2 ring-blue-600 ring-offset-1 border-white'
                            : 'border-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!isSimple && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-600">Paper Background</span>
                  <div className="flex items-center gap-1.5">
                    {PAPER_SWATCHES.map((s) => (
                      <button
                        key={s.color}
                        type="button"
                        title={s.label}
                        onClick={() => onUpdateSettings({ paperColor: s.color })}
                        style={{ backgroundColor: s.color }}
                        className={`h-5 w-5 rounded-full border cursor-pointer transition-transform ${
                          settings.paperColor === s.color
                            ? 'scale-110 ring-2 ring-blue-600 ring-offset-1 border-zinc-400'
                            : 'border-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print Sharpness */}
            <div className="border-t border-zinc-100 pt-5 space-y-2.5">
              <h2 className="text-xs font-semibold text-zinc-900">PDF Print Quality</h2>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      dpi: 150,
                      title: isSimple ? 'Standard · Home Printer (150 DPI)' : '150 DPI · Standard',
                      desc: 'Fastest download and smaller PDF file',
                    },
                    {
                      dpi: 300,
                      title: isSimple
                        ? 'High Quality · Recommended (300 DPI)'
                        : '300 DPI · High-Res Print',
                      desc: 'Crisp photo, sticker & print-shop quality',
                    },
                    {
                      dpi: 600,
                      title: isSimple ? 'Ultra Crisp · Fine Detail (600 DPI)' : '600 DPI · Ultra Sharp',
                      desc: 'Best for tiny labels, business cards & artwork',
                    },
                  ] as { dpi: ExportDpi; title: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.dpi}
                    type="button"
                    onClick={() => onUpdateSettings({ dpi: opt.dpi })}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                      settings.dpi === opt.dpi
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-900">{opt.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {!isSimple && (
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2.5 space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-600">
                    <span>Sheet pixel size</span>
                    <span className="font-mono tabular-nums text-zinc-900">
                      {geometry.targetPagePxW} × {geometry.targetPagePxH} px
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Each slot size</span>
                    <span className="font-mono tabular-nums text-zinc-900">
                      {formatDimensions(geometry.cellWidthMm, geometry.cellHeightMm, settings.unit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Each slot pixels</span>
                    <span className="font-mono tabular-nums text-zinc-900">
                      {geometry.targetCellPxW} × {geometry.targetCellPxH} px
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Filename */}
            <div className="border-t border-zinc-100 pt-5">
              <label htmlFor="pdf-filename" className="block text-xs font-semibold text-zinc-900 mb-1.5">
                Save PDF As
              </label>
              <input
                id="pdf-filename"
                type="text"
                value={settings.pdfFilename}
                onChange={(e) => onUpdateSettings({ pdfFilename: e.target.value })}
                placeholder="my-print-sheet"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 font-mono text-[10px] text-zinc-500 truncate">
                {(settings.pdfFilename.trim() || 'sheetpress-grid')}-{settings.columns}x{settings.rows}-{settings.dpi}dpi.pdf
              </p>
            </div>

            {/* Offline Project Save / Load (Advanced Mode) */}
            {!isSimple && (
              <div className="border-t border-zinc-100 pt-5">
                <h2 className="text-xs font-semibold text-zinc-900 mb-2">Offline Project Backup</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={images.length === 0}
                    onClick={onDownloadProject}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5" />
                    <span>Save File</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenProjectPicker}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open File</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guided Step Navigation Footer */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3 shrink-0">
        {activeTab === 'images' && (
          <button
            type="button"
            onClick={() => onTabChange('layout')}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <span>Next: Choose Grid Layout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {activeTab === 'layout' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange('images')}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Photos</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('print')}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <span>Next: Cut Lines &amp; PDF</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'print' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTabChange('layout')}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Layout</span>
            </button>
            <button
              type="button"
              disabled={images.length === 0 || isExporting}
              onClick={onExportPdf}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
