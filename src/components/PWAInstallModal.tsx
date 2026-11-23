import React from 'react';
import { CheckCircle2, Download, HardDriveDownload, Laptop, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadProjectBackup: () => void;
  hasImages: boolean;
}

export const PWAInstallButton: React.FC<{ onOpenGuide: () => void }> = ({ onOpenGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-blue-600" />
        Install App
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpenGuide}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
    >
      <Download className="w-3.5 h-3.5" />
      {isIOS ? 'Install on iOS' : 'Get Offline App'}
    </button>
  );
};

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onDownloadProjectBackup,
  hasImages,
}) => {
  const { isInstallable, isInstalled, isIOS, swReady, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-app-title"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="offline-app-title" className="text-lg font-semibold text-zinc-900">
              Use SheetPress Offline
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Install SheetPress on your computer or phone so it opens instantly without internet. Every PDF is generated locally on your device.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close offline app guide"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Service Worker Cache Readiness */}
        <div className="mt-5 flex items-center justify-between border-y border-zinc-100 py-3 text-sm">
          <div className="flex items-center gap-2.5 text-zinc-800">
            {swReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
            <span>
              {swReady
                ? 'Offline engine cached and ready in this browser'
                : 'Offline cache initializes automatically on first load'}
            </span>
          </div>
          {isInstalled && (
            <span className="font-mono text-xs text-emerald-700 font-medium whitespace-nowrap">
              Installed
            </span>
          )}
        </div>

        {/* Native 1-Click Install CTA when supported */}
        {isInstallable && !isInstalled && (
          <div className="mt-5">
            <button
              type="button"
              onClick={async () => {
                const accepted = await install();
                if (accepted) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download &amp; Install SheetPress Now
            </button>
          </div>
        )}

        {/* Clear platform instructions */}
        <div className="mt-5 space-y-4">
          {!isIOS && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Desktop (Chrome, Edge, Brave, Arc)</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  Click the <strong>Install icon</strong> on the right side of your browser address bar, or open browser menu → <strong>Save and share → Install SheetPress</strong>. If you are viewing inside an embedded preview, open the app in a full browser tab first.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {isIOS ? 'iPhone & iPad (Safari)' : 'Mobile (iOS Safari & Android Chrome)'}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                On iPhone/iPad: tap the <strong>Share</strong> icon in Safari, then choose <strong>Add to Home Screen</strong>. On Android Chrome: tap the menu (⋮) and choose <strong>Install app</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-zinc-100">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-zinc-900">Portable Offline Project File</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                Your images and grid layout auto-save locally in your browser. You can also save a portable backup file to reopen on another computer offline.
              </p>
              <button
                type="button"
                disabled={!hasImages}
                onClick={() => {
                  onDownloadProjectBackup();
                  onClose();
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                Save Project File (.sheetpress.json)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
