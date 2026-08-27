'use client';

/**
 * AvatarUpload
 *
 * No external crop library — uses a plain drag-to-pan / pinch-to-zoom
 * canvas crop UI built from scratch with pointer events.
 *
 * Flow:
 *  1. User clicks "Change photo" → file picker opens
 *  2. After file selection the crop UI (canvas) appears
 *  3. User drags to position / uses slider to zoom, then clicks "Crop"
 *  4. A circular preview of the cropped result is shown
 *  5. User clicks "Save" → XHR upload with progress bar
 *  6. On success the auth-store is patched → Header avatar updates instantly
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Camera, X, Check, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadsApi, usersApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

/* ─── constants ─────────────────────────────────────────────────────────── */

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT_ATTR    = 'image/jpeg,image/png,image/webp';
const ACCEPT_TYPES   = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Size (px) of the square crop canvas shown in the UI */
const CANVAS_SIZE = 320;
/** Size (px) of the exported circular crop */
const EXPORT_SIZE = 400;

/* ─── helpers ────────────────────────────────────────────────────────────── */

/** Clamp a value between min and max */
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Render the current view (image translated + scaled inside the crop circle)
 * onto a 2-D canvas context and return the context.
 */
function drawCropPreview(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  canvasSize: number,
) {
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  // Dim background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 2, 0, Math.PI * 2);
  ctx.clip();

  const w = img.naturalWidth  * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, offsetX, offsetY, w, h);
  ctx.restore();

  // Circle border
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Export the current crop to a JPEG Blob at EXPORT_SIZE × EXPORT_SIZE.
 */
function exportCrop(
  img: HTMLImageElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  canvasSize: number,
): Promise<Blob> {
  const ratio   = EXPORT_SIZE / canvasSize;
  const offCanvas = document.createElement('canvas');
  offCanvas.width  = EXPORT_SIZE;
  offCanvas.height = EXPORT_SIZE;

  const ctx = offCanvas.getContext('2d')!;

  // Circular clip
  ctx.beginPath();
  ctx.arc(EXPORT_SIZE / 2, EXPORT_SIZE / 2, EXPORT_SIZE / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    img,
    offsetX * ratio,
    offsetY * ratio,
    img.naturalWidth  * scale * ratio,
    img.naturalHeight * scale * ratio,
  );

  return new Promise<Blob>((resolve, reject) => {
    offCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/jpeg',
      0.92,
    );
  });
}

/* ─── types ─────────────────────────────────────────────────────────────── */

interface Props {
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onSaved?: (url: string) => void;
}

/* ─── component ─────────────────────────────────────────────────────────── */

export function AvatarUpload({ currentAvatarUrl, userName, onSaved }: Props) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const inputRef   = useRef<HTMLInputElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  /* ── loaded image ── */
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const rawSrcRef = useRef<string | null>(null);

  /* ── crop pan/zoom state ── */
  const offsetRef  = useRef({ x: 0, y: 0 });
  const scaleRef   = useRef(1);
  const dragRef    = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  /* ── react state ── */
  const [showCropper, setShowCropper]   = useState(false);
  const [zoom, setZoom]                 = useState(1);
  const [previewSrc, setPreviewSrc]     = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob]   = useState<Blob | null>(null);
  const [progress, setProgress]         = useState(0);
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [saved, setSaved]               = useState(false);

  /* ── redraw whenever zoom changes ── */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCropPreview(ctx, img, offsetRef.current.x, offsetRef.current.y, scaleRef.current, CANVAS_SIZE);
  }, []);

  useEffect(() => {
    scaleRef.current = zoom;
    redraw();
  }, [zoom, redraw]);

  /* ── file selection ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!ACCEPT_TYPES.has(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    setError(null);
    setSaved(false);
    setPreviewSrc(null);
    setCroppedBlob(null);

    if (rawSrcRef.current) URL.revokeObjectURL(rawSrcRef.current);
    const src = URL.createObjectURL(file);
    rawSrcRef.current = src;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;

      // Centre the image inside the crop circle at fit-scale
      const fitScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
      const initScale = fitScale;
      scaleRef.current = initScale;

      offsetRef.current = {
        x: (CANVAS_SIZE - img.naturalWidth  * initScale) / 2,
        y: (CANVAS_SIZE - img.naturalHeight * initScale) / 2,
      };

      setZoom(initScale);
      setShowCropper(true);
    };
    img.onerror = () => setError('Failed to load image.');
    img.src = src;
  }

  /* ── canvas pointer events (drag to pan) ── */
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || !imgRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const img = imgRef.current;
    const s   = scaleRef.current;

    // Constrain so image always covers the circle
    const minX = CANVAS_SIZE - img.naturalWidth  * s;
    const minY = CANVAS_SIZE - img.naturalHeight * s;

    offsetRef.current = {
      x: clamp(dragRef.current.ox + dx, Math.min(minX, 0), 0),
      y: clamp(dragRef.current.oy + dy, Math.min(minY, 0), 0),
    };
    redraw();
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  /* ── "Crop" button ── */
  async function handleCrop() {
    const img = imgRef.current;
    if (!img) return;
    setError(null);
    try {
      const blob = await exportCrop(
        img,
        offsetRef.current.x,
        offsetRef.current.y,
        scaleRef.current,
        CANVAS_SIZE,
      );
      setCroppedBlob(blob);
      const prev = URL.createObjectURL(blob);
      setPreviewSrc(prev);
      setShowCropper(false);

      // Cleanup raw src
      if (rawSrcRef.current) {
        URL.revokeObjectURL(rawSrcRef.current);
        rawSrcRef.current = null;
      }
      imgRef.current = null;
    } catch {
      setError('Crop failed — please try a different image.');
    }
  }

  /* ── "Cancel crop" button ── */
  function handleCancelCrop() {
    setShowCropper(false);
    if (rawSrcRef.current) { URL.revokeObjectURL(rawSrcRef.current); rawSrcRef.current = null; }
    imgRef.current = null;
  }

  /* ── "Save" button ── */
  async function handleSave() {
    if (!croppedBlob) return;
    setError(null);
    setProgress(0);
    setUploading(true);
    try {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const { url } = await uploadsApi.uploadAvatar(file, setProgress);

      // Patch auth store → Header re-renders immediately
      updateUser({ avatarUrl: url });

      if (previewSrc) URL.revokeObjectURL(previewSrc);
      setPreviewSrc(null);
      setCroppedBlob(null);
      setSaved(true);
      onSaved?.(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  /* ── discard preview ── */
  function handleDiscard() {
    if (previewSrc) URL.revokeObjectURL(previewSrc);
    setPreviewSrc(null);
    setCroppedBlob(null);
    setProgress(0);
    setError(null);
  }

  const displayUrl = previewSrc ?? currentAvatarUrl ?? null;
  const initials   = userName?.charAt(0)?.toUpperCase() ?? 'U';

  /* ─── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* ── Avatar ring ── */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white shadow-md bg-hamplard-lilac flex items-center justify-center">
          {displayUrl ? (
            <img src={displayUrl} alt="Avatar preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-hamplard-primary">{initials}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setSaved(false); inputRef.current?.click(); }}
          aria-label="Change profile photo"
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-hamplard-primary text-white shadow ring-2 ring-white transition hover:bg-hamplard-mid"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      {/* ── Canvas crop UI ── */}
      {showCropper && (
        <div className="w-full rounded-2xl overflow-hidden border border-ink-100 bg-[#111] shadow-lg">

          {/* Canvas */}
          <div className="flex justify-center py-4 bg-[#111]">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-grab active:cursor-grabbing rounded-full touch-none"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 bg-[#1a1a2e] px-5 py-3">
            <ZoomOut className="h-4 w-4 text-white/50 shrink-0" />
            <input
              type="range"
              min={zoom * 0.5}
              max={zoom * 3}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                const v = Number(e.target.value);
                const img = imgRef.current;
                if (!img) return;
                // Keep centre anchor when zooming
                const cx = CANVAS_SIZE / 2;
                const cy = CANVAS_SIZE / 2;
                const ratio = v / scaleRef.current;
                offsetRef.current = {
                  x: cx - (cx - offsetRef.current.x) * ratio,
                  y: cy - (cy - offsetRef.current.y) * ratio,
                };
                setZoom(v);
              }}
              className="flex-1 accent-hamplard-primary"
              aria-label="Zoom"
            />
            <ZoomIn className="h-4 w-4 text-white/50 shrink-0" />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 bg-[#1a1a2e] border-t border-white/10 px-5 py-3">
            <button
              type="button"
              onClick={handleCancelCrop}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCrop}
              className="inline-flex items-center gap-1.5 rounded-lg bg-hamplard-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-hamplard-mid transition"
            >
              <Check className="h-3.5 w-3.5" />
              Crop
            </button>
          </div>
        </div>
      )}

      {/* ── Preview + save ── */}
      {croppedBlob && previewSrc && !showCropper && (
        <div className="w-full rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Preview</p>
          <div className="flex items-center gap-4">
            <img
              src={previewSrc}
              alt="Cropped preview"
              className="h-16 w-16 rounded-full object-cover ring-2 ring-hamplard-lilac shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-800">Looks good?</p>
              <p className="text-xs text-ink-400">Click Save to update your avatar.</p>

              {uploading && (
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Upload progress"
                  className="mt-2 h-1.5 w-full rounded-full bg-ink-100 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-hamplard-primary transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 hover:bg-ink-50 transition disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-hamplard-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-hamplard-mid transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading {progress}%
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {saved && (
        <p className="text-xs font-medium text-leaf-700 bg-leaf-50 border border-leaf-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
          Avatar updated
        </p>
      )}

      {/* ── Error ── */}
      {error && (
        <p className="w-full rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <p className="text-[11px] text-ink-400">JPEG, PNG or WebP · max 5 MB</p>
    </div>
  );
}
