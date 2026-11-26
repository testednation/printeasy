import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, SlidersHorizontal, X } from 'lucide-react';
import { BeginnerGuideModal } from './components/BeginnerGuideModal';
import { ExportProgressModal } from './components/ExportProgressModal';
import { LivePreviewCanvas, type StarterGoal } from './components/LivePreviewCanvas';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton, PWAInstallModal } from './components/PWAInstallModal';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';
import { SidebarControls, type SidebarTab } from './components/SidebarControls';
import { usePWAInstall } from './hooks/usePWAInstall';
import type {
  GridPreset,
  GridSuggestion,
  ImageCrop,
  ImageFilter,
  LayoutSettings,
  SheetImage,
} from './types/sheet';
import { loadFilesAsSheetImages, loadSampleSheetImages } from './utils/imageLoader';
import {
  computePages,
  computeSheetGeometry,
  DEFAULT_SETTINGS,
  getCroppedSourceDimensions,
} from './utils/layoutEngine';
import { exportSheetGridToPdf, type ExportProgress } from './utils/pdfExporter';
import {
  downloadProjectBackup,
  loadSavedImages,
  loadSavedSettings,
  parseProjectBackup,
  saveImagesToDB,
  saveSettings,
} from './utils/storage';

interface HistorySnapshot {
  settings: LayoutSettings;
  images: SheetImage[];
}

export default function App() {
  const [settings, setSettings] = useState<LayoutSettings>(() => loadSavedSettings());
  const [images, setImages] = useState<SheetImage[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('images');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<{
    filename: string;
    pageCount: number;
    imageCount: number;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const { isInstallable, install } = usePWAInstall();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2800);
  }, []);

  const pushHistory = useCallback((currentSettings: LayoutSettings, currentImages: SheetImage[]) => {
    setHistory((prev) => [...prev.slice(-24), { settings: currentSettings, images: currentImages }]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setSettings(last.settings);
      setImages(last.images);
      showToast('Undid last change');
      return prev.slice(0, -1);
    });
  }, [showToast]);

  // Load previously saved offline images from IndexedDB on first mount
  useEffect(() => {
    let active = true;
    loadSavedImages().then((saved) => {
      if (!active) return;
      if (saved.length > 0) {
        setImages(saved);
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!hydrated) return;
    void saveImagesToDB(images);
  }, [images, hydrated]);

  const geometry = useMemo(() => computeSheetGeometry(settings), [settings]);
  const pages = useMemo(() => computePages(images, settings, geometry), [images, settings, geometry]);

  useEffect(() => {
    if (activePageIndex > pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 1));
    }
  }, [pages.length, activePageIndex]);

  // Global keyboard shortcuts (Ctrl/Cmd+Z undo, arrows, ?, R, Del, V, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTextInput =
        target !== null &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Escape') {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else if (helpModalOpen) {
          setHelpModalOpen(false);
        } else if (offlineModalOpen) {
          setOfflineModalOpen(false);
        } else if (selectedImageId) {
          setSelectedImageId(null);
        }
        return;
      }

      if (inTextInput || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActivePageIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'single' ? 'all' : 'single'));
      } else if (e.key.toLowerCase() === 'r' && selectedImageId) {
        e.preventDefault();
        pushHistory(settings, images);
        setImages((prev) =>
          prev.map((img) =>
            img.id === selectedImageId
              ? { ...img, rotation: (((img.rotation + 90) % 360) as 0 | 90 | 180 | 270) }
              : img
          )
        );
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageId) {
        e.preventDefault();
        pushHistory(settings, images);
        setImages((prev) => prev.filter((img) => img.id !== selectedImageId));
        setSelectedImageId(null);
        showToast('Removed selected photo (Ctrl+Z to undo)');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pages.length,
    handleUndo,
    shortcutsOpen,
    helpModalOpen,
    offlineModalOpen,
    selectedImageId,
    pushHistory,
    settings,
    images,
    showToast,
  ]);

  const handleUpdateSettings = useCallback(
    (patch: Partial<LayoutSettings>) => {
      pushHistory(settings, images);
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [pushHistory, settings, images]
  );

  const handleApplyPreset = useCallback(
    (preset: GridPreset) => {
      pushHistory(settings, images);
      setSettings((prev) => ({
        ...prev,
        columns: preset.columns,
        rows: preset.rows,
        marginMm: preset.marginMm,
        gapMm: preset.gapMm,
        fitMode: preset.fitMode,
        guideStyle: preset.guideStyle,
      }));
      showToast(`Applied ${preset.name} (${preset.columns}×${preset.rows})`);
    },
    [pushHistory, settings, images, showToast]
  );

  const handleApplyGridSuggestion = useCallback(
    (suggestion: GridSuggestion) => {
      pushHistory(settings, images);
      setSettings((prev) => ({
        ...prev,
        columns: suggestion.columns,
        rows: suggestion.rows,
        orientation: suggestion.orientation,
      }));
      showToast(
        `Applied ${suggestion.columns}×${suggestion.rows} ${suggestion.orientation} grid (${suggestion.efficiencyPercent}% space used)`
      );
    },
    [pushHistory, settings, images, showToast]
  );

  const handleQuickStartGoal = useCallback(
    (goal: StarterGoal) => {
      pushHistory(settings, images);
      if (goal === 'repeatOne') {
        setSettings((prev) => ({
          ...prev,
          columns: 3,
          rows: 3,
          marginMm: 10,
          gapMm: 5,
          repeatBehavior: 'fillPage',
          fitMode: 'cover',
          guideStyle: 'dashedLines',
        }));
      } else if (goal === 'multiPhoto') {
        setSettings((prev) => ({
          ...prev,
          columns: 2,
          rows: 2,
          marginMm: 10,
          gapMm: 6,
          repeatBehavior: 'perImage',
          fitMode: 'cover',
          guideStyle: 'cropMarks',
        }));
      } else {
        setSettings((prev) => ({
          ...prev,
          columns: 2,
          rows: 5,
          marginMm: 10,
          gapMm: 3,
          repeatBehavior: 'fillPage',
          fitMode: 'cover',
          guideStyle: 'cropMarks',
        }));
      }
      fileInputRef.current?.click();
    },
    [pushHistory, settings, images]
  );

  const handleAddFiles = useCallback(
    async (files: FileList | File[]) => {
      const loaded = await loadFilesAsSheetImages(files, 1);
      if (loaded.length === 0) {
        showToast('Please pick image files (PNG, JPG, WebP, or GIF).');
        return;
      }
      pushHistory(settings, images);
      setImages((prev) => {
        if (prev.length === 0 && loaded.length === 1 && settings.repeatBehavior === 'perImage') {
          return [{ ...loaded[0], copies: geometry.slotsPerPage }];
        }
        return [...prev, ...loaded];
      });
      setSelectedImageId(loaded[0].id);
      showToast(
        loaded.length === 1
          ? `Added ${loaded[0].name}`
          : `Added ${loaded.length} photos to your sheet`
      );
    },
    [geometry.slotsPerPage, images, pushHistory, settings, showToast]
  );

  const handleLoadSamples = useCallback(async () => {
    const samples = await loadSampleSheetImages();
    if (samples.length === 0) {
      showToast('Could not load sample images right now.');
      return;
    }
    pushHistory(settings, images);
    setImages(samples);
    setSettings((prev) => ({
      ...prev,
      columns: 3,
      rows: 3,
      repeatBehavior: 'perImage',
      fitMode: 'cover',
      guideStyle: 'cropMarks',
    }));
    setSelectedImageId(samples[0].id);
    setActivePageIndex(0);
    showToast('Loaded 3 sample prints (3 copies each on a 3×3 sheet)');
  }, [images, pushHistory, settings, showToast]);

  const handleUpdateImageCopies = useCallback(
    (id: string, copies: number) => {
      pushHistory(settings, images);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, copies: Math.max(1, Math.min(200, copies)) } : img
        )
      );
    },
    [images, pushHistory, settings]
  );

  const handleUpdateImageFilter = useCallback(
    (id: string, filter: ImageFilter) => {
      pushHistory(settings, images);
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, filter } : img))
      );
    },
    [images, pushHistory, settings]
  );

  const handleUpdateImageCrop = useCallback(
    (id: string, crop: ImageCrop | undefined) => {
      pushHistory(settings, images);
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, crop } : img))
      );
      showToast(crop ? 'Applied custom crop to photo' : 'Reset photo to full frame');
    },
    [images, pushHistory, settings, showToast]
  );

  const handleToggleAspectLock = useCallback(() => {
    pushHistory(settings, images);
    setSettings((prev) => {
      const nextLocked = !prev.lockAspectRatio;
      return {
        ...prev,
        lockAspectRatio: nextLocked,
        fitMode: nextLocked && prev.fitMode === 'stretch' ? 'cover' : prev.fitMode,
      };
    });
    showToast(
      settings.lockAspectRatio
        ? 'Aspect ratio unlocked — stretching enabled'
        : 'Aspect ratio locked — proportions protected'
    );
  }, [images, pushHistory, settings, showToast]);

  const handleSetAllCopies = useCallback(
    (copies: number) => {
      pushHistory(settings, images);
      setImages((prev) => prev.map((img) => ({ ...img, copies })));
      showToast(`Set every photo to ${copies} ${copies === 1 ? 'copy' : 'copies'}`);
    },
    [images, pushHistory, settings, showToast]
  );

  const handleIncrementCopy = useCallback(
    (id: string) => {
      pushHistory(settings, images);
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, copies: Math.min(200, img.copies + 1) } : img))
      );
    },
    [images, pushHistory, settings]
  );

  const handleRotateImage = useCallback(
    (id: string) => {
      pushHistory(settings, images);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, rotation: (((img.rotation + 90) % 360) as 0 | 90 | 180 | 270) }
            : img
        )
      );
    },
    [images, pushHistory, settings]
  );

  const handleAutoOrientAllImages = useCallback(() => {
    if (images.length === 0) {
      showToast('Add images first to auto-rotate them to fit your grid.');
      return;
    }

    const slotIsLandscape = geometry.cellWidthMm > geometry.cellHeightMm + 0.5;
    const slotIsPortrait = geometry.cellHeightMm > geometry.cellWidthMm + 0.5;

    if (!slotIsLandscape && !slotIsPortrait) {
      showToast('Grid slots are square—all orientations use space equally.');
      return;
    }

    let rotatedCount = 0;
    const nextImages: SheetImage[] = images.map((img) => {
      const cropped = getCroppedSourceDimensions(img);
      const swapped = img.rotation === 90 || img.rotation === 270;
      const curW = swapped ? cropped.height : cropped.width;
      const curH = swapped ? cropped.width : cropped.height;
      const imgIsLandscape = curW > curH * 1.02;
      const imgIsPortrait = curH > curW * 1.02;

      if ((slotIsLandscape && imgIsPortrait) || (slotIsPortrait && imgIsLandscape)) {
        rotatedCount++;
        return {
          ...img,
          rotation: (((img.rotation + 90) % 360) as 0 | 90 | 180 | 270),
        };
      }
      return img;
    });

    const targetLabel = slotIsLandscape ? 'landscape' : 'portrait';

    if (rotatedCount === 0 && !settings.autoRotate) {
      showToast(`All images already match the ${targetLabel} grid slots.`);
      return;
    }

    pushHistory(settings, images);
    if (settings.autoRotate) {
      setSettings((prev) => ({ ...prev, autoRotate: false }));
    }
    setImages(nextImages);
    showToast(
      rotatedCount > 0
        ? `Rotated ${rotatedCount} ${rotatedCount === 1 ? 'image' : 'images'} to ${targetLabel} to maximize slot space`
        : `All images aligned to ${targetLabel} grid slots`
    );
  }, [geometry.cellHeightMm, geometry.cellWidthMm, images, pushHistory, settings, showToast]);

  const handleRemoveImage = useCallback(
    (id: string) => {
      pushHistory(settings, images);
      setImages((prev) => prev.filter((img) => img.id !== id));
      setSelectedImageId((prev) => (prev === id ? null : prev));
    },
    [images, pushHistory, settings]
  );

  const handleClearAllImages = useCallback(() => {
    pushHistory(settings, images);
    setImages([]);
    setSelectedImageId(null);
    setActivePageIndex(0);
    showToast('Cleared all photos (click Undo to restore)');
  }, [images, pushHistory, settings, showToast]);

  const handleReorderImages = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= images.length ||
        toIndex >= images.length ||
        fromIndex === toIndex
      ) {
        return;
      }
      pushHistory(settings, images);
      setImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [images, pushHistory, settings]
  );

  const handleToggleSetting = useCallback((key: 'showRulers' | 'showResolutionOverlay') => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleResetLayout = useCallback(() => {
    pushHistory(settings, images);
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, beginnerMode: prev.beginnerMode }));
    showToast('Reset grid settings to default');
  }, [images, pushHistory, settings, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (images.length === 0 || isExporting) {
      if (images.length === 0) {
        showToast('Add at least one photo before downloading a PDF.');
      }
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportResult(null);

    try {
      const result = await exportSheetGridToPdf(pages, geometry, settings, (progress) => {
        setExportProgress(progress);
      });
      setExportResult(result);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'An unexpected error occurred while creating your PDF.'
      );
    } finally {
      setIsExporting(false);
    }
  }, [images.length, isExporting, pages, geometry, settings, showToast]);

  const handleDownloadProject = useCallback(() => {
    if (images.length === 0) return;
    downloadProjectBackup(settings, images);
    showToast('Saved offline project backup file');
  }, [images, settings, showToast]);

  const handleProjectFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const restored = await parseProjectBackup(file);
        pushHistory(settings, images);
        setSettings(restored.settings);
        setImages(restored.images);
        setActivePageIndex(0);
        showToast(`Opened project with ${restored.images.length} photos`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not open project file');
      }
    },
    [images, pushHistory, settings, showToast]
  );

  const handleOfflineNavClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        showToast('SheetPress installed for offline use');
        return;
      }
    }
    setOfflineModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F3F4F6] text-zinc-900">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleAddFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".json,.sheetpress.json,application/json"
        className="hidden"
        onChange={handleProjectFileSelected}
      />

      {/* Strict 3-Zone Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-8 border-b border-zinc-200 bg-white px-4 sm:px-6 z-30">
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open layout controls"
            className="lg:hidden rounded-lg border border-zinc-200 p-1.5 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('single');
            }}
            className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            <svg className="h-6 w-6 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="#18181B" />
              <rect x="7" y="7" width="8" height="8" rx="1.5" fill="#FFFFFF" />
              <rect x="17" y="7" width="8" height="8" rx="1.5" fill="#2563EB" />
              <rect x="7" y="17" width="8" height="8" rx="1.5" fill="#FFFFFF" />
              <rect x="17" y="17" width="8" height="8" rx="1.5" fill="#FFFFFF" />
            </svg>
            <span>SheetPress</span>
          </a>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'single'
                ? 'text-zinc-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                : 'hover:text-zinc-900'
            }`}
          >
            Live Sheet
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'all'
                ? 'text-zinc-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                : 'hover:text-zinc-900'
            }`}
          >
            All Pages ({pages.length})
          </button>
          <button
            type="button"
            onClick={handleOfflineNavClick}
            className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Offline App
          </button>
          <button
            type="button"
            onClick={handleResetLayout}
            className="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset Grid
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={images.length === 0 || isExporting}
            onClick={() => void handleExportPdf()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>Export PDF</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden lg:flex w-[352px] shrink-0 flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <SidebarControls
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              images={images}
              settings={settings}
              geometry={geometry}
              selectedImageId={selectedImageId}
              isExporting={isExporting}
              onSelectImage={setSelectedImageId}
              onOpenFilePicker={() => fileInputRef.current?.click()}
              onLoadSamples={() => void handleLoadSamples()}
              onUpdateImageCopies={handleUpdateImageCopies}
              onUpdateImageFilter={handleUpdateImageFilter}
              onUpdateImageCrop={handleUpdateImageCrop}
              onSetAllCopies={handleSetAllCopies}
              onRotateImage={handleRotateImage}
              onRemoveImage={handleRemoveImage}
              onClearAllImages={handleClearAllImages}
              onReorderImages={handleReorderImages}
              onUpdateSettings={handleUpdateSettings}
              onToggleAspectLock={handleToggleAspectLock}
              onApplyPreset={handleApplyPreset}
              onApplyGridSuggestion={handleApplyGridSuggestion}
              onAutoOrientAllImages={handleAutoOrientAllImages}
              onDownloadProject={handleDownloadProject}
              onOpenProjectPicker={() => projectInputRef.current?.click()}
              onExportPdf={() => void handleExportPdf()}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-r border-zinc-200 bg-zinc-50 px-4 py-2.5 shrink-0">
            <span className="text-[11px] text-zinc-600 truncate">Works 100% offline</span>
            <PWAInstallButton onOpenGuide={() => setOfflineModalOpen(true)} />
          </div>
        </div>

        {/* Mobile Controls Drawer */}
        {mobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 flex lg:hidden bg-zinc-950/40 backdrop-blur-[1px]"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <div
              className="relative flex h-full w-[88vw] max-w-[360px] flex-col bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                <span className="text-sm font-semibold text-zinc-900">Sheet Controls</span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close controls"
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <SidebarControls
                  activeTab={sidebarTab}
                  onTabChange={setSidebarTab}
                  images={images}
                  settings={settings}
                  geometry={geometry}
                  selectedImageId={selectedImageId}
                  isExporting={isExporting}
                  onSelectImage={setSelectedImageId}
                  onOpenFilePicker={() => fileInputRef.current?.click()}
                  onLoadSamples={() => void handleLoadSamples()}
                  onUpdateImageCopies={handleUpdateImageCopies}
                  onUpdateImageFilter={handleUpdateImageFilter}
                  onUpdateImageCrop={handleUpdateImageCrop}
                  onSetAllCopies={handleSetAllCopies}
                  onRotateImage={handleRotateImage}
                  onRemoveImage={handleRemoveImage}
                  onClearAllImages={handleClearAllImages}
                  onReorderImages={handleReorderImages}
                  onUpdateSettings={handleUpdateSettings}
                  onToggleAspectLock={handleToggleAspectLock}
                  onApplyPreset={handleApplyPreset}
                  onApplyGridSuggestion={handleApplyGridSuggestion}
                  onAutoOrientAllImages={handleAutoOrientAllImages}
                  onDownloadProject={handleDownloadProject}
                  onOpenProjectPicker={() => projectInputRef.current?.click()}
                  onExportPdf={() => {
                    setMobileDrawerOpen(false);
                    void handleExportPdf();
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 shrink-0">
                <span className="text-[11px] text-zinc-600">Works 100% offline</span>
                <PWAInstallButton onOpenGuide={() => setOfflineModalOpen(true)} />
              </div>
            </div>
          </div>
        )}

        {/* Real-Time WYSIWYG Live Preview Canvas */}
        <LivePreviewCanvas
          pages={pages}
          geometry={geometry}
          settings={settings}
          viewMode={viewMode}
          activePageIndex={activePageIndex}
          selectedImageId={selectedImageId}
          hasImages={images.length > 0}
          imageCount={images.length}
          canUndo={history.length > 0}
          shortcutsOpen={shortcutsOpen}
          onUndo={handleUndo}
          onOpenHelp={() => setHelpModalOpen(true)}
          onToggleShortcuts={() => setShortcutsOpen((prev) => !prev)}
          onQuickStartGoal={handleQuickStartGoal}
          onSelectPage={setActivePageIndex}
          onSwitchViewMode={setViewMode}
          onSelectImage={setSelectedImageId}
          onFilesDropped={(files) => void handleAddFiles(files)}
          onOpenFilePicker={() => fileInputRef.current?.click()}
          onLoadSamples={() => void handleLoadSamples()}
          onRotateImage={handleRotateImage}
          onIncrementCopy={handleIncrementCopy}
          onRemoveImage={handleRemoveImage}
          onReorderImages={handleReorderImages}
          onToggleSetting={handleToggleSetting}
        />
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white shadow-lg whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}

      <ShortcutsOverlay
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <OfflineIndicator />

      <BeginnerGuideModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onLoadSamples={() => void handleLoadSamples()}
        hasImages={images.length > 0}
      />

      <PWAInstallModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        onDownloadProjectBackup={handleDownloadProject}
        hasImages={images.length > 0}
      />

      <ExportProgressModal
        isExporting={isExporting}
        progress={exportProgress}
        lastResult={exportResult}
        error={exportError}
        onClose={() => {
          setExportResult(null);
          setExportError(null);
          setExportProgress(null);
        }}
      />
    </div>
  );
}
