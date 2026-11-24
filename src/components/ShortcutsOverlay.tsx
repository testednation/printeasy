import React, { useMemo } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  label: string;
  keys: string[];
}

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
  }, []);

  if (!isOpen) return null;

  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: ShortcutRow[] = [
    { label: 'Undo last change', keys: [modKey, 'Z'] },
    { label: 'Previous / next page', keys: ['←', '→'] },
    { label: 'Zoom in / out', keys: ['+', '−'] },
    { label: 'Fit sheet to screen', keys: ['0'] },
    { label: 'Rotate selected photo', keys: ['R'] },
    { label: 'Remove selected photo', keys: ['Del'] },
    { label: 'Single / All pages view', keys: ['V'] },
    { label: 'Toggle shortcuts panel', keys: ['?'] },
    { label: 'Close panel / deselect', keys: ['Esc'] },
  ];

  return (
    <aside
      role="region"
      aria-label="Keyboard shortcuts cheat sheet"
      className="fixed bottom-4 right-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
          <Keyboard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Keyboard Shortcuts</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close keyboard shortcuts"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {shortcuts.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 text-[11px] text-zinc-600"
          >
            <span className="truncate">{item.label}</span>
            <span className="flex items-center gap-1 shrink-0">
              {item.keys.map((key, idx) => (
                <React.Fragment key={key}>
                  {idx > 0 && item.keys[0] === modKey && (
                    <span className="text-[10px] text-zinc-400">+</span>
                  )}
                  <kbd className="inline-flex min-w-[20px] items-center justify-center rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-800 shadow-2xs">
                    {key}
                  </kbd>
                </React.Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
};
