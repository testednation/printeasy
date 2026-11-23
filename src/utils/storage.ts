import type { LayoutSettings, SheetImage } from '../types/sheet';
import { DEFAULT_SETTINGS } from './layoutEngine';

const SETTINGS_KEY = 'sheetpress_settings_v1';
const DB_NAME = 'sheetpress_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'project_state';
const IMAGES_KEY = 'current_images';

export function loadSavedSettings(): LayoutSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LayoutSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: LayoutSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSavedImages(): Promise<SheetImage[]> {
  try {
    const db = await openDB();
    return await new Promise<SheetImage[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(IMAGES_KEY);
      req.onsuccess = () => {
        const res = req.result;
        resolve(Array.isArray(res) ? res : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveImagesToDB(images: SheetImage[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(images, IMAGES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-fatal in private browsing or constrained environments
  }
}

export interface OfflineProjectFile {
  format: 'sheetpress-project';
  version: 1;
  savedAt: string;
  settings: LayoutSettings;
  images: SheetImage[];
}

export function downloadProjectBackup(settings: LayoutSettings, images: SheetImage[]): void {
  const payload: OfflineProjectFile = {
    format: 'sheetpress-project',
    version: 1,
    savedAt: new Date().toISOString(),
    settings,
    images,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const baseName = (settings.pdfFilename || 'sheetpress-project').replace(/[^a-z0-9-_]/gi, '-');
  a.href = url;
  a.download = `${baseName}.sheetpress.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function parseProjectBackup(file: File): Promise<{ settings: LayoutSettings; images: SheetImage[] }> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<OfflineProjectFile>;
  if (parsed.format !== 'sheetpress-project' || !Array.isArray(parsed.images)) {
    throw new Error('This file is not a valid SheetPress project backup.');
  }
  return {
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    images: parsed.images,
  };
}
