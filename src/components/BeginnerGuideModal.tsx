import React from 'react';
import { FileDown, Grid2X2, ImagePlus, Move, WifiOff, X } from 'lucide-react';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSamples: () => void;
  hasImages: boolean;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onLoadSamples,
  hasImages,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beginner-guide-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="beginner-guide-title" className="text-lg font-semibold text-zinc-900">
              How to Make a Print Sheet in 3 Steps
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              No design experience needed. Everything updates live as you click, and works without internet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close beginner guide"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex gap-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ImagePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">01. Add Photos &amp; Choose Repeat</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                Upload one photo to repeat it across the whole sheet (great for stickers, labels, or ID photos), or upload many photos to build a multi-image sheet. Use <strong>+ / −</strong> to set exact copies.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Grid2X2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">02. Pick a Grid &amp; Rearrange Live</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                Tap any visual grid preset (like <strong>3×3 Stickers</strong> or <strong>2×4 Wallet</strong>). Choose <strong>Fill Box</strong> for edge-to-edge tiles or <strong>Show Whole Photo</strong> to avoid any cropping.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Drag Tiles Directly on the Sheet</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                Drag any photo right on the live paper preview to swap its order. Hover any tile to rotate it or add another copy. Made a mistake? Click <strong>Undo</strong> anytime.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">03. Add Cut Lines &amp; Export High-Res PDF</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                Turn on dashed lines or corner crop marks so cutting with scissors is effortless. Click <strong>Export PDF</strong> to download a crisp 300 DPI print-ready PDF straight from your device.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <span>Your photos never leave your device—everything stays private and works offline.</span>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {!hasImages && (
            <button
              type="button"
              onClick={() => {
                onLoadSamples();
                onClose();
              }}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Try Sample Photos
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
