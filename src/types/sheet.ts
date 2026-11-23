export type PaperSizeKey = 'a4' | 'letter' | 'a3' | 'a5' | 'legal' | 'photo4x6' | 'custom';
export type Orientation = 'portrait' | 'landscape';
export type FitMode = 'contain' | 'cover' | 'stretch';
export type GuideStyle = 'none' | 'cropMarks' | 'dashedLines' | 'solidBorder';
export type ExportDpi = 150 | 300 | 600;
export type UnitSystem = 'mm' | 'in';
export type RepeatBehavior = 'perImage' | 'fillPage';
export type ImageFilter = 'none' | 'grayscale' | 'sepia' | 'invert';

export interface PaperDefinition {
  key: PaperSizeKey;
  label: string;
  widthMm: number;
  heightMm: number;
  subtitle: string;
}

export interface SheetImage {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  copies: number;
  rotation: 0 | 90 | 180 | 270;
  filter?: ImageFilter;
}

export interface LayoutSettings {
  paperSize: PaperSizeKey;
  customWidthMm: number;
  customHeightMm: number;
  orientation: Orientation;
  columns: number;
  rows: number;
  marginMm: number;
  gapMm: number;
  fitMode: FitMode;
  autoRotate: boolean;
  guideStyle: GuideStyle;
  guideColor: string;
  paperColor: string;
  dpi: ExportDpi;
  unit: UnitSystem;
  repeatBehavior: RepeatBehavior;
  showRulers: boolean;
  showResolutionOverlay: boolean;
  beginnerMode: boolean;
  pdfFilename: string;
}

export interface GridPreset {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  marginMm: number;
  gapMm: number;
  fitMode: FitMode;
  guideStyle: GuideStyle;
}

export interface SheetGeometry {
  pageWidthMm: number;
  pageHeightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  marginMm: number;
  gapMm: number;
  columns: number;
  rows: number;
  slotsPerPage: number;
  cellWidthMm: number;
  cellHeightMm: number;
  targetCellPxW: number;
  targetCellPxH: number;
  targetPagePxW: number;
  targetPagePxH: number;
}

export interface SlotPlacement {
  slotIndex: number;
  globalIndex: number;
  row: number;
  col: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  image: SheetImage | null;
  imageQueueIndex: number;
  copyNumber: number;
  effectiveRotation: 0 | 90 | 180 | 270;
  effectiveDpi: number | null;
  isLowRes: boolean;
  // Exact drawn image rect inside the cell (in mm relative to cell origin)
  drawRectMm: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface ComputedPage {
  pageIndex: number;
  slots: SlotPlacement[];
  filledCount: number;
}

export interface GridSuggestion {
  columns: number;
  rows: number;
  orientation: Orientation;
  efficiencyPercent: number;
  currentEfficiencyPercent: number;
  improvementPercent: number;
  pagesNeeded: number;
  emptySlots: number;
  avgAspectLabel: string;
  reason: string;
  isAlreadyOptimal: boolean;
}

