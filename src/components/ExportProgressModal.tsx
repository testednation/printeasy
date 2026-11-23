import React from 'react';
import { CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import type { ExportProgress } from '../utils/pdfExporter';

interface ExportProgressModalProps {
  isExporting: boolean;
  progress: ExportProgress | null;
  lastResult: { filename: string; pageCount: number; imageCount: number } | null;
  error: string | null;
  onClose: () => void;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isExporting,
  progress,
  lastResult,
  error,
  onClose,
}) => {
  if (!isExporting && !lastResult && !error) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl">
        {isExporting && progress && (
          <div>
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Building High-Resolution PDF</h3>
                <p className="text-xs text-zinc-600">
                  {progress.stage === 'preparing' && 'Preparing image buffers...'}
                  {progress.stage === 'rendering' &&
                    `Rendering sheet ${progress.currentPage} of ${progress.totalPages}...`}
                  {progress.stage === 'saving' && 'Packaging PDF document...'}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-blue-600 transition-all duration-150"
                style={{ width: `${Math.min(100, Math.max(5, progress.percent))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
              <span>Offline local render</span>
              <span>{progress.percent}%</span>
            </div>
          </div>
        )}

        {!isExporting && error && (
          <div>
            <h3 className="text-sm font-semibold text-red-700">Export Could Not Complete</h3>
            <p className="mt-1.5 text-xs text-zinc-600">{error}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {!isExporting && lastResult && !error && (
          <div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-semibold text-zinc-900">PDF Ready &amp; Downloaded</h3>
            </div>
            <div className="mt-3 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2.5 text-xs text-zinc-700 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-zinc-900 truncate">
                <FileDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{lastResult.filename}</span>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-zinc-500">
                {lastResult.pageCount} {lastResult.pageCount === 1 ? 'page' : 'pages'} · {lastResult.imageCount}{' '}
                {lastResult.imageCount === 1 ? 'placed image' : 'placed images'}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
