import React, { useMemo, useRef, useState } from 'react';
import { Check, Crop, RotateCcw, X } from 'lucide-react';
import type { ImageCrop, SheetImage } from '../types/sheet';
import { getImageCssFilter } from '../utils/layoutEngine';

type AspectPresetKey = 'free' | 'slot' | '1:1' | '4:3' | '3:4' | '3:2' | '16:9';
type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface ImageCropPanelProps {
  image: SheetImage;
  slotAspect: number;
  onApply: (crop: ImageCrop | undefined) => void;
  onClose: () => void;
}

const MIN_SIZE = 0.08;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function fitCropToAspect(
  targetDisplayAspect: number,
  imgNaturalAspect: number
): ImageCrop {
  // targetDisplayAspect = (cropW * natW) / (cropH * natH) = (cropW / cropH) * imgNaturalAspect
  // => cropW / cropH = targetDisplayAspect / imgNaturalAspect
  const normRatio = targetDisplayAspect / Math.max(0.01, imgNaturalAspect);
  let width = 1;
  let height = 1;
  if (normRatio > 1) {
    width = 1;
    height = clamp(1 / normRatio, MIN_SIZE, 1);
  } else {
    height = 1;
    width = clamp(normRatio, MIN_SIZE, 1);
  }
  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

export const ImageCropPanel: React.FC<ImageCropPanelProps> = ({
  image,
  slotAspect,
  onApply,
  onClose,
}) => {
  const imgAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  // If image is rotated 90/270, invert slotAspect so "Match Slot" matches the rotated slot shape!
  const effectiveSlotAspect =
    image.rotation === 90 || image.rotation === 270 ? 1 / Math.max(0.05, slotAspect) : slotAspect;

  const [preset, setPreset] = useState<AspectPresetKey>('free');
  const [crop, setCrop] = useState<ImageCrop>(() =>
    image.crop ? { ...image.crop } : { x: 0, y: 0, width: 1, height: 1 }
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    handle: DragHandle;
    startClientX: number;
    startClientY: number;
    startCrop: ImageCrop;
  } | null>(null);

  const lockedDisplayAspect = useMemo<number | null>(() => {
    switch (preset) {
      case 'slot':
        return effectiveSlotAspect;
      case '1:1':
        return 1;
      case '4:3':
        return 4 / 3;
      case '3:4':
        return 3 / 4;
      case '3:2':
        return 3 / 2;
      case '16:9':
        return 16 / 9;
      default:
        return null;
    }
  }, [preset, effectiveSlotAspect]);

  const handleSelectPreset = (nextPreset: AspectPresetKey) => {
    setPreset(nextPreset);
    if (nextPreset === 'free') return;
    let ratio = 1;
    if (nextPreset === 'slot') ratio = effectiveSlotAspect;
    else if (nextPreset === '4:3') ratio = 4 / 3;
    else if (nextPreset === '3:4') ratio = 3 / 4;
    else if (nextPreset === '3:2') ratio = 3 / 2;
    else if (nextPreset === '16:9') ratio = 16 / 9;
    setCrop(fitCropToAspect(ratio, imgAspect));
  };

  const startDrag = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - drag.startClientX) / rect.width;
    const dy = (e.clientY - drag.startClientY) / rect.height;
    const s = drag.startCrop;

    if (drag.handle === 'move') {
      setCrop({
        ...s,
        x: clamp(s.x + dx, 0, 1 - s.width),
        y: clamp(s.y + dy, 0, 1 - s.height),
      });
      return;
    }

    // Corner resize handles
    const normRatio =
      lockedDisplayAspect !== null ? lockedDisplayAspect / Math.max(0.01, imgAspect) : null;
    const minW = normRatio !== null ? Math.max(MIN_SIZE, MIN_SIZE * normRatio) : MIN_SIZE;

    let left = s.x;
    let top = s.y;
    let right = s.x + s.width;
    let bottom = s.y + s.height;

    if (drag.handle === 'se') {
      right = clamp(right + dx, left + minW, 1);
      bottom = normRatio !== null ? top + (right - left) / normRatio : clamp(bottom + dy, top + MIN_SIZE, 1);
      if (bottom > 1) {
        bottom = 1;
        if (normRatio !== null) right = left + (bottom - top) * normRatio;
      }
    } else if (drag.handle === 'sw') {
      left = clamp(left + dx, 0, right - minW);
      bottom = normRatio !== null ? top + (right - left) / normRatio : clamp(bottom + dy, top + MIN_SIZE, 1);
      if (bottom > 1) {
        bottom = 1;
        if (normRatio !== null) left = right - (bottom - top) * normRatio;
      }
    } else if (drag.handle === 'ne') {
      right = clamp(right + dx, left + minW, 1);
      top = normRatio !== null ? bottom - (right - left) / normRatio : clamp(top + dy, 0, bottom - MIN_SIZE);
      if (top < 0) {
        top = 0;
        if (normRatio !== null) right = left + (bottom - top) * normRatio;
      }
    } else if (drag.handle === 'nw') {
      left = clamp(left + dx, 0, right - minW);
      top = normRatio !== null ? bottom - (right - left) / normRatio : clamp(top + dy, 0, bottom - MIN_SIZE);
      if (top < 0) {
        top = 0;
        if (normRatio !== null) left = right - (bottom - top) * normRatio;
      }
    }

    const finalW = Math.max(MIN_SIZE, Math.min(1, right - left));
    const finalH = Math.max(MIN_SIZE, Math.min(1, bottom - top));
    setCrop({
      x: clamp(left, 0, 1 - finalW),
      y: clamp(top, 0, 1 - finalH),
      width: finalW,
      height: finalH,
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  const croppedPxW = Math.max(1, Math.round(image.naturalWidth * crop.width));
  const croppedPxH = Math.max(1, Math.round(image.naturalHeight * crop.height));
  const isUncropped =
    crop.x <= 0.002 && crop.y <= 0.002 && crop.width >= 0.996 && crop.height >= 0.996;

  const presets: { key: AspectPresetKey; label: string }[] = [
    { key: 'free', label: 'Free' },
    { key: 'slot', label: 'Match Slot' },
    { key: '1:1', label: '1:1' },
    { key: '4:3', label: '4:3' },
    { key: '3:4', label: '3:4' },
    { key: '3:2', label: '3:2' },
    { key: '16:9', label: '16:9' },
  ];

  return (
    <div
      className="rounded-lg border border-blue-200 bg-zinc-50 p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Crop className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-xs font-semibold text-zinc-900 truncate">
            Crop: {image.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close crop tool"
          className="rounded p-1 text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Aspect Ratio Selector */}
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => handleSelectPreset(p.key)}
            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
              preset === p.key
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Interactive Drag & Resize Crop Stage */}
      <div className="flex justify-center rounded-md bg-zinc-900/95 p-2 overflow-hidden">
        <div
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            aspectRatio: `${image.naturalWidth} / ${image.naturalHeight}`,
          }}
          className="relative max-h-52 w-full max-w-full select-none touch-none overflow-hidden"
        >
          <img
            src={image.dataUrl}
            alt={image.name}
            referrerPolicy="no-referrer"
            draggable={false}
            style={{ filter: getImageCssFilter(image.filter) }}
            className="h-full w-full object-contain pointer-events-none"
          />

          {/* Dimmed Outside Overlay via 4 crisp scrims */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 bg-zinc-950/60"
            style={{ height: `${crop.y * 100}%` }}
          />
          <div
            className="pointer-events-none absolute left-0 right-0 bottom-0 bg-zinc-950/60"
            style={{ height: `${(1 - crop.y - crop.height) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute left-0 bg-zinc-950/60"
            style={{
              top: `${crop.y * 100}%`,
              height: `${crop.height * 100}%`,
              width: `${crop.x * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute right-0 bg-zinc-950/60"
            style={{
              top: `${crop.y * 100}%`,
              height: `${crop.height * 100}%`,
              width: `${(1 - crop.x - crop.width) * 100}%`,
            }}
          />

          {/* Draggable Crop Box */}
          <div
            onPointerDown={startDrag('move')}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
            className="absolute cursor-move border-[1.5px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          >
            {/* Rule of thirds hairlines */}
            <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/35" />
            <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/35" />
            <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/35" />
            <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/35" />

            {/* 4 Interactive Corner Handles */}
            <button
              type="button"
              aria-label="Resize top-left corner"
              onPointerDown={startDrag('nw')}
              className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow cursor-nwse-resize"
            />
            <button
              type="button"
              aria-label="Resize top-right corner"
              onPointerDown={startDrag('ne')}
              className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow cursor-nesw-resize"
            />
            <button
              type="button"
              aria-label="Resize bottom-left corner"
              onPointerDown={startDrag('sw')}
              className="absolute -left-2 -bottom-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow cursor-nesw-resize"
            />
            <button
              type="button"
              aria-label="Resize bottom-right corner"
              onPointerDown={startDrag('se')}
              className="absolute -right-2 -bottom-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow cursor-nwse-resize"
            />
          </div>
        </div>
      </div>

      {/* Live Output Pixel Readout & Actions */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600">
        <span className="font-mono tabular-nums">
          {croppedPxW} × {croppedPxH} px
        </span>
        <button
          type="button"
          onClick={() => {
            setPreset('free');
            setCrop({ x: 0, y: 0, width: 1, height: 1 });
          }}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(isUncropped ? undefined : crop)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          Apply Crop
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
