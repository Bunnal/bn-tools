"use client";

import { useState, useRef, useCallback } from "react";
import { WatermarkEngine } from "@/engine/sdk/browser.js";
import { useHistory } from "@/store/HistoryContext";
import styles from "./page.module.css";

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

const canvasToBlob = async (canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> => {
  if ("toBlob" in canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to convert canvas to blob"));
      }, "image/png");
    });
  } else if ("convertToBlob" in canvas) {
    return await canvas.convertToBlob({ type: "image/png" });
  } else {
    throw new Error("Canvas type is not supported");
  }
};

export default function ImageRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ text: string; tone: string }>({ text: "", tone: "info" });
  const [dragging, setDragging] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  // Settings states
  const [modelQuality, setModelQuality] = useState("high");
  const [alphaGain, setAlphaGain] = useState(1.00);
  const [preserveExif, setPreserveExif] = useState(true);
  const [autoCrop, setAutoCrop] = useState(false);

  // History
  const { addRecord } = useHistory();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    setProcessedUrl(null);
    setProgress(0);
    setStatus({ text: `Loaded: ${f.name} (${(f.size / 1024).toFixed(0)} KB)`, tone: "info" });
  }, [originalUrl, processedUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleProcess = useCallback(async () => {
    if (!file || !originalUrl || processing) return;
    setProcessing(true);
    setProgress(10);
    setStatus({ text: "Loading image data...", tone: "info" });

    try {
      const img = await loadImage(originalUrl);
      setProgress(30);
      setStatus({ text: "Initializing watermark engine...", tone: "info" });

      const engine = await WatermarkEngine.create();
      setProgress(50);
      setStatus({ text: "Processing image watermark removal...", tone: "info" });

      // Run watermark removal with alphaGain override
      const options: any = {
        adaptiveMode: modelQuality === "fast" ? "never" : "auto",
        alphaGainCandidates: [alphaGain],
      };

      const canvas = await engine.removeWatermarkFromImage(img, options);
      setProgress(85);
      setStatus({ text: "Generating output image file...", tone: "info" });

      const blob = await canvasToBlob(canvas);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setProgress(100);
      setStatus({ text: "Watermark removed successfully", tone: "success" });
      setProcessing(false);

      // Record to history
      const now = Date.now();
      addRecord({
        id: `img-${now}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: "image",
        fileSize: file.size,
        dimensions: `${img.naturalWidth}×${img.naturalHeight}`,
        status: "completed",
        createdAt: now,
        completedAt: Date.now(),
        outputSize: blob.size,
        settings: { modelQuality, alphaGain, preserveExif, autoCrop },
      });
    } catch (error: any) {
      console.error(error);
      setStatus({ text: error?.message || "Watermark removal failed", tone: "error" });
      setProcessing(false);
    }
  }, [file, originalUrl, processing, modelQuality, alphaGain, processedUrl]);

  const handleSliderDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const clientX = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setSliderPos(pos);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);
  }, []);

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ───────────────────────────── */}
      <div className={styles.breadcrumb}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <span className={styles.breadcrumbActive}>Image Remover</span>
        <span className={styles.breadcrumbSep}>›</span>
        <a href="/video" className={styles.breadcrumbLink}>Switch to Video</a>
      </div>

      <div className={styles.layout}>
        {/* ── Workspace ──────────────────────────── */}
        <div className={styles.workspace}>
          <div className={styles.compareCard}>
            <div
              ref={sliderRef}
              className={styles.compareViewer}
              onMouseDown={handleSliderDrag}
              onTouchStart={handleSliderDrag}
            >
              {/* Original Side */}
              <div className={styles.compareOriginal} style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                {originalUrl ? (
                  <img src={originalUrl} alt="Original" className={styles.compareImg} />
                ) : (
                  <div className={styles.comparePlaceholder}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  </div>
                )}
                <span className={styles.badgeOriginal}>● Original</span>
              </div>

              {/* Cleaned Side */}
              <div className={styles.compareCleaned}>
                {processedUrl ? (
                  <img src={processedUrl} alt="Cleaned" className={styles.compareImg} />
                ) : (
                  <div className={styles.comparePlaceholderClean}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                    <span>PixelClean</span>
                    <span className={styles.studioLabel}>Image Remover Studio</span>
                  </div>
                )}
                <span className={styles.badgeCleaned}>● Cleaned</span>
              </div>

              {/* Slider Handle */}
              <div className={styles.sliderLine} style={{ left: `${sliderPos}%` }}>
                <div className={styles.sliderHandle}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3l-5 9 5 9"/><path d="M16 3l5 9-5 9"/></svg>
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div className={styles.statusBar}>
              <div className={styles.statusLeft}>
                {status.tone === "success" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                )}
                <span className={status.tone === "success" ? styles.statusSuccess : styles.statusText}>
                  {status.text || "Drop an image to get started"}
                </span>
              </div>
              {file && (
                <span className={styles.statusMeta}>
                  {file.name.split(".").pop()?.toUpperCase()} • {(file.size / 1024).toFixed(0)} KB
                </span>
              )}
            </div>

            {/* Progress */}
            {processing && (
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ────────────────────────────── */}
        <div className={styles.sidebar}>
          {/* Dropzone */}
          <div
            className={`${styles.dropzone} ${dragging ? styles.dropzoneDragging : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <svg className={styles.dropzoneIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span className={styles.dropzoneTitle}>Drop image here</span>
            <span className={styles.dropzoneHint}>PNG, JPG, WebP up to 20MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Processing Options */}
          <div className={styles.optionsCard}>
            <h3 className={styles.optionsTitle}>Processing Options</h3>

            <div className={styles.field}>
              <label className="label">MODEL QUALITY</label>
              <select className="select" value={modelQuality} onChange={(e) => setModelQuality(e.target.value)}>
                <option value="high">High Quality (AI Enhanced)</option>
                <option value="standard">Standard</option>
                <option value="fast">Fast (Lower Quality)</option>
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldHeader}>
                <label className="label">ALPHA GAIN</label>
                <span className={styles.fieldValue}>{alphaGain.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="2.00"
                step="0.05"
                value={alphaGain}
                onChange={(e) => setAlphaGain(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            <div className={styles.divider} />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Preserve EXIF Data</span>
              <button
                type="button"
                className={`toggle ${preserveExif ? "active" : ""}`}
                onClick={() => setPreserveExif(!preserveExif)}
              />
            </div>

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Auto-Crop Padding</span>
              <button
                type="button"
                className={`toggle ${autoCrop ? "active" : ""}`}
                onClick={() => setAutoCrop(!autoCrop)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              className="btn btn-primary btn-full"
              onClick={handleProcess}
              disabled={!file || processing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.121 2.121m8.486 8.486l2.121 2.121M5.636 18.364l2.121-2.121m8.486-8.486l2.121-2.121"/></svg>
              {processing ? "Processing..." : "Process Image"}
            </button>

            <button
              className="btn btn-outline btn-full"
              disabled={!processedUrl}
              onClick={() => {
                if (processedUrl) {
                  const a = document.createElement("a");
                  a.href = processedUrl;
                  a.download = `${file?.name?.replace(/\.[^.]+$/, "") || "cleaned"}_pixelclean.png`;
                  a.click();
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Result
            </button>

            <button className="btn btn-ghost btn-full" onClick={() => {
              setFile(null);
              if (originalUrl) URL.revokeObjectURL(originalUrl);
              if (processedUrl && processedUrl !== originalUrl) URL.revokeObjectURL(processedUrl);
              setOriginalUrl(null);
              setProcessedUrl(null);
              setProgress(0);
              setStatus({ text: "", tone: "info" });
            }}>
              Reset all settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
