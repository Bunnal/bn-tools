"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useHistory } from "@/store/HistoryContext";
import styles from "./page.module.css";

// --------------------------------------------------------------------------
// Resolution presets
// --------------------------------------------------------------------------
const RESOLUTION_PRESETS: Record<string, { width: number; height: number; label: string; sub: string }> = {
  original: { width: 0, height: 0, label: "Original", sub: "Source resolution" },
  "1080p":  { width: 1920, height: 1080, label: "HD 1080p",  sub: "1920×1080 · 8 Mbps" },
  "2k":     { width: 2560, height: 1440, label: "2K 1440p",   sub: "2560×1440 · 16 Mbps" },
  "4k":     { width: 3840, height: 2160, label: "4K 2160p",   sub: "3840×2160 · 35 Mbps" },
};

const BITRATE_MAP: Record<string, number> = {
  original: 12_000_000,
  "1080p":  8_000_000,
  "2k":     16_000_000,
  "4k":     35_000_000,
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatDuration(totalMinutes: number, unit: "minutes" | "hours") {
  const minutes = unit === "hours" ? totalMinutes * 60 : totalMinutes;
  return formatTime(minutes * 60);
}

// --------------------------------------------------------------------------
// Page component
// --------------------------------------------------------------------------
export default function VideoRemoverPage() {
  // File & preview
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Sidebar settings
  const [exportQuality, setExportQuality] = useState("original");
  const [preserveAudio, setPreserveAudio] = useState(true);
  const [adaptiveAlpha, setAdaptiveAlpha] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopValue, setLoopValue] = useState(5);
  const [loopUnit, setLoopUnit] = useState<"minutes" | "hours">("minutes");

  // Modal (extra export options)
  const [showExportModal, setShowExportModal] = useState(false);
  const [modalQuality, setModalQuality] = useState("original");

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [phase, setPhase] = useState<"detect" | "export" | "done" | "">("");
  const [progress, setProgress] = useState(0);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [frameEstimate, setFrameEstimate] = useState(0);
  const [status, setStatus] = useState<{ text: string; tone: string }>({ text: "", tone: "info" });

  // Download
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadName, setDownloadName] = useState("cleaned-video.mp4");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const processedVideoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef(false);

  // History
  const { addRecord } = useHistory();

  // Sync both video players
  useEffect(() => {
    const orig = originalVideoRef.current;
    const proc = processedVideoRef.current;
    if (!orig || !proc) return;

    const onPlay = () => { if (proc.paused) proc.play().catch(() => {}); };
    const onPause = () => { if (!proc.paused) proc.pause(); };
    const onSeeked = () => { proc.currentTime = orig.currentTime; };

    orig.addEventListener("play", onPlay);
    orig.addEventListener("pause", onPause);
    orig.addEventListener("seeked", onSeeked);
    return () => {
      orig.removeEventListener("play", onPlay);
      orig.removeEventListener("pause", onPause);
      orig.removeEventListener("seeked", onSeeked);
    };
  }, [processedUrl]);

  // ---------- File handling ----------
  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setStatus({ text: "Only video files are accepted.", tone: "error" });
      return;
    }
    abortRef.current = true; // cancel any running export
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setOriginalUrl(URL.createObjectURL(f));
    setProcessedUrl(null);
    setDownloadBlob(null);
    setProgress(0);
    setFramesProcessed(0);
    setPhase("");
    setStatus({ text: `Loaded: ${f.name}`, tone: "info" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ---------- Playback ----------
  const togglePlay = useCallback(() => {
    const v = originalVideoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  // ---------- Detect only ----------
  const handleDetect = useCallback(async () => {
    if (!file || processing) return;
    setProcessing(true);
    abortRef.current = false;
    setPhase("detect");
    setProgress(0);
    setStatus({ text: "Detecting watermark…", tone: "info" });

    try {
      const { detectGeminiVideoWatermark } = await import("@/engine/video/videoExport.js") as {
        detectGeminiVideoWatermark: (file: File, options?: Record<string, unknown>) => Promise<{ metadata: Record<string, unknown>; detection: Record<string, unknown> }>;
      };

      const result = await detectGeminiVideoWatermark(file, {
        onProgress: (p: { phase: string; progress: number }) => {
          if (abortRef.current) throw new Error("Aborted");
          setProgress(Math.round((p.progress ?? 0) * 100));
        }
      });

      const det = result.detection as Record<string, unknown>;
      const pos = det?.position as Record<string, unknown> | null;
      if (det?.isConfident && pos) {
        setStatus({
          text: `Watermark detected at ${pos.x},${pos.y} — ${pos.width}×${pos.height}px (confidence: ${
            ((det.confidence as number) * 100).toFixed(1)
          }%)`,
          tone: "success"
        });
      } else {
        setStatus({ text: "No confident watermark detected. Try exporting anyway.", tone: "warn" });
      }
      setPhase("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Aborted")) {
        setStatus({ text: `Detection failed: ${msg}`, tone: "error" });
      }
      setPhase("");
    } finally {
      setProcessing(false);
    }
  }, [file, processing]);

  // ---------- Main export ----------
  const handleExport = useCallback(async () => {
    if (!file || processing) return;
    setShowExportModal(false);
    setProcessing(true);
    abortRef.current = false;
    setPhase("detect");
    setProgress(0);
    setFramesProcessed(0);
    setStatus({ text: "Detecting watermark…", tone: "info" });

    const loopSeconds = loopEnabled
      ? (loopUnit === "hours" ? loopValue * 3600 : loopValue * 60)
      : 0;

    const qualityKey = modalQuality || exportQuality;
    const preset = RESOLUTION_PRESETS[qualityKey] || RESOLUTION_PRESETS.original;
    const videoBitrate = BITRATE_MAP[qualityKey] || BITRATE_MAP.original;

    try {
      const { removeGeminiVideoWatermark } = await import("@/engine/video/videoExport.js") as {
        removeGeminiVideoWatermark: (file: File, options?: Record<string, unknown>) => Promise<{ blob: Blob; processedFrames: number; metadata: Record<string, unknown> }>;
      };

      const result = await removeGeminiVideoWatermark(file, {
        // Resolution
        ...(preset.width > 0 ? { outputWidth: preset.width, outputHeight: preset.height } : {}),
        videoBitrate,

        // Audio
        preserveAudio,

        // Loop
        loopEnabled: loopEnabled && loopSeconds > 0,
        loopDurationSeconds: loopSeconds,

        // Alpha
        adaptiveAlpha,
        allowLowConfidence: true,

        // Progress
        onProgress: (p: {
          phase: string;
          progress: number;
          processedFrames?: number;
          frameEstimate?: number;
        }) => {
          if (abortRef.current) throw new Error("Aborted");
          const pct = Math.round((p.progress ?? 0) * 100);
          if (p.phase === "detect") {
            setPhase("detect");
            setProgress(pct);
            setStatus({ text: `Detecting watermark… ${pct}%`, tone: "info" });
          } else if (p.phase === "export") {
            setPhase("export");
            setProgress(pct);
            setFramesProcessed(p.processedFrames ?? 0);
            if (p.frameEstimate) setFrameEstimate(p.frameEstimate);
            setStatus({
              text: `Exporting… ${p.processedFrames ?? 0} frames processed`,
              tone: "info"
            });
          }
        },

        yieldToMainThread: () => new Promise((r) => setTimeout(r, 0)),
      });

      if (abortRef.current) return;

      // Store result
      setDownloadBlob(result.blob);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const suffix = loopEnabled ? `_looped_${loopValue}${loopUnit[0]}` : "_cleaned";
      const resTag = qualityKey !== "original" ? `_${qualityKey}` : "";
      setDownloadName(`${baseName}${suffix}${resTag}.mp4`);

      // Preview
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      const url = URL.createObjectURL(result.blob);
      setProcessedUrl(url);
      setPhase("done");
      setProgress(100);
      setStatus({
        text: `Export complete! ${result.processedFrames} frames processed.`,
        tone: "success"
      });

      // Record to history
      const now = Date.now();
      addRecord({
        id: `vid-${now}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileType: "video",
        fileSize: file.size,
        dimensions: preset.width > 0 ? `${preset.width}×${preset.height}` : "Original",
        duration: formatTime(videoDuration),
        status: "completed",
        createdAt: now,
        completedAt: Date.now(),
        outputSize: result.blob.size,
        settings: {
          quality: qualityKey,
          loopEnabled,
          loopValue: loopEnabled ? loopValue : undefined,
          loopUnit: loopEnabled ? loopUnit : undefined,
          preserveAudio,
          adaptiveAlpha,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Aborted")) {
        setStatus({ text: `Export failed: ${msg}`, tone: "error" });
        setPhase("");
      }
    } finally {
      setProcessing(false);
    }
  }, [file, processing, loopEnabled, loopUnit, loopValue, exportQuality, modalQuality, preserveAudio, adaptiveAlpha, processedUrl, videoDuration, addRecord]);

  // ---------- Download ----------
  const handleDownload = useCallback(() => {
    if (!downloadBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(downloadBlob);
    a.download = downloadName;
    a.click();
  }, [downloadBlob, downloadName]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* ── Video Workspace ─────────────────────── */}
        <div className={styles.workspace}>
          <div className={styles.videoCard}>
            <div className={styles.videoPanes}>
              {/* Original */}
              <div className={styles.videoPane}>
                <span className={styles.badgeOriginal}>ORIGINAL</span>
                {originalUrl ? (
                  <video
                    ref={originalVideoRef}
                    src={originalUrl}
                    className={styles.video}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => setVideoDuration((e.target as HTMLVideoElement).duration)}
                    onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                    onEnded={() => setPlaying(false)}
                  />
                ) : (
                  <div className={styles.videoEmpty}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
                    <span className={styles.videoEmptyText}>Drop a video to start</span>
                  </div>
                )}
              </div>

              {/* Processed */}
              <div className={styles.videoPane}>
                {processedUrl ? (
                  <>
                    <span className={styles.badgeCleaned}>● CLEANED</span>
                    <video ref={processedVideoRef} src={processedUrl} className={styles.video} playsInline preload="metadata" muted />
                  </>
                ) : (
                  <div className={styles.videoEmpty}>
                    {processing ? (
                      <div className={styles.processingOverlay}>
                        <div className={styles.processingSpinner} />
                        <span className={styles.processingLabel}>
                          {phase === "detect" ? "Detecting…" : phase === "export" ? "Exporting…" : "Starting…"}
                        </span>
                        {phase === "export" && frameEstimate > 0 && (
                          <span className={styles.processingFrames}>
                            {framesProcessed} / {frameEstimate} frames
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.videoEmptyText}>Processed output appears here</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Player Controls */}
            <div className={styles.controls}>
              <button className={styles.playBtn} onClick={togglePlay} disabled={!originalUrl} type="button">
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                )}
              </button>

              <input
                type="range"
                className={styles.scrubber}
                min={0}
                max={videoDuration || 1}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setCurrentTime(t);
                  if (originalVideoRef.current) originalVideoRef.current.currentTime = t;
                }}
                disabled={!originalUrl}
              />

              <span className={styles.timeLabel}>
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>

              <button
                className={`${styles.loopBtn} ${loopEnabled ? styles.loopActive : ""}`}
                onClick={() => setLoopEnabled(!loopEnabled)}
                type="button"
                title="Toggle loop output"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              </button>
            </div>
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span className={styles.dropzoneTitle}>{file ? file.name : "Drop video here"}</span>
            <span className={styles.dropzoneHint}>MP4, WebM, MOV supported</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/mov"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Settings Card */}
          <div className={styles.settingsCard}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Settings</h3>
            </div>

            <div className={styles.field}>
              <label className="label">OUTPUT QUALITY</label>
              <select className="select" value={exportQuality} onChange={(e) => setExportQuality(e.target.value)}>
                {Object.entries(RESOLUTION_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.sub}</option>
                ))}
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Loop Output</span>
              <button type="button" className={`toggle ${loopEnabled ? "active" : ""}`} onClick={() => setLoopEnabled(!loopEnabled)} />
            </div>

            {loopEnabled && (
              <div className={styles.loopInputs}>
                <input
                  type="number"
                  className="input"
                  min={0.1}
                  max={1440}
                  step={0.5}
                  value={loopValue}
                  onChange={(e) => setLoopValue(Number(e.target.value))}
                />
                <select className="select" value={loopUnit} onChange={(e) => setLoopUnit(e.target.value as "minutes" | "hours")} style={{ width: "auto", flex: "0 0 110px" }}>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
                <div className={styles.loopPreview}>
                  Output: {formatDuration(loopValue, loopUnit)}
                </div>
              </div>
            )}

            <div className={styles.divider} />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Preserve Audio</span>
              <button type="button" className={`toggle ${preserveAudio ? "active" : ""}`} onClick={() => setPreserveAudio(!preserveAudio)} />
            </div>

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Adaptive Alpha</span>
              <button type="button" className={`toggle ${adaptiveAlpha ? "active" : ""}`} onClick={() => setAdaptiveAlpha(!adaptiveAlpha)} />
            </div>
          </div>

          {/* Progress Card */}
          {(processing || phase === "done") && (
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={phase === "done" ? styles.progressDone : styles.progressActive}>
                  {phase === "detect" ? "Detecting…" : phase === "export" ? "Exporting…" : "Complete!"}
                </span>
                {phase === "export" && (
                  <span className={styles.progressFrames}>{framesProcessed} frames</span>
                )}
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              <p className={status.tone === "success" ? styles.statusSuccess : status.tone === "error" ? styles.statusError : status.tone === "warn" ? styles.statusWarn : styles.statusText}>{status.text}</p>
            </div>
          )}

          {/* Status (when not in progress card) */}
          {!processing && phase !== "done" && status.text && (
            <p className={`${styles.statusText} tone-${status.tone}`}>{status.text}</p>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              id="btn-detect-watermark"
              className="btn btn-outline btn-full"
              disabled={!file || processing}
              onClick={handleDetect}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Detect Watermark
            </button>

            <button
              id="btn-export-video"
              className="btn btn-primary btn-full"
              disabled={!file || processing}
              onClick={() => setShowExportModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4"/></svg>
              Export Clean Video
            </button>

            <button
              id="btn-download-video"
              className="btn btn-outline btn-full"
              disabled={!downloadBlob}
              onClick={handleDownload}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Result
            </button>
          </div>
        </div>
      </div>

      {/* ── Export Settings Modal ─────────────────── */}
      {showExportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Export Settings</h2>
              <button className="btn-icon btn-ghost" onClick={() => setShowExportModal(false)} type="button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Resolution */}
              <div className={styles.modalSection}>
                <label className="label">RESOLUTION</label>
                <div className={styles.resGrid}>
                  {Object.entries(RESOLUTION_PRESETS).map(([k, v]) => (
                    <button
                      key={k}
                      className={`${styles.resTile} ${modalQuality === k ? styles.resTileActive : ""}`}
                      onClick={() => { setModalQuality(k); setExportQuality(k); }}
                      type="button"
                    >
                      <span className={styles.resTileLabel}>{v.label}</span>
                      <span className={styles.resTileSub}>{v.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loop */}
              <div className={styles.modalSection}>
                <div className={styles.toggleRow}>
                  <span className="label">LOOP SETTINGS</span>
                  <button type="button" className={`toggle ${loopEnabled ? "active" : ""}`} onClick={() => setLoopEnabled(!loopEnabled)} />
                </div>
                {loopEnabled && (
                  <div className={styles.loopInputs} style={{ marginTop: "0.75rem" }}>
                    <input
                      type="number"
                      className="input"
                      value={loopValue}
                      onChange={(e) => setLoopValue(Number(e.target.value))}
                      min={0.1}
                      max={1440}
                      step={0.5}
                    />
                    <select className="select" value={loopUnit} onChange={(e) => setLoopUnit(e.target.value as "minutes" | "hours")} style={{ width: "auto", flex: "0 0 110px" }}>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                    <div className={styles.loopPreview}>
                      Output: {formatDuration(loopValue, loopUnit)}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.divider} />

              {/* Advanced */}
              <div className={styles.modalSection}>
                <label className="label">ADVANCED</label>
                <div className={styles.toggleRow}>
                  <div className={styles.advancedToggleRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <span className={styles.toggleLabel}>Preserve Audio</span>
                  </div>
                  <button type="button" className={`toggle ${preserveAudio ? "active" : ""}`} onClick={() => setPreserveAudio(!preserveAudio)} />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.advancedToggleRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4"/></svg>
                    <span className={styles.toggleLabel}>Adaptive Alpha</span>
                  </div>
                  <button type="button" className={`toggle ${adaptiveAlpha ? "active" : ""}`} onClick={() => setAdaptiveAlpha(!adaptiveAlpha)} />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button id="btn-start-export" className="btn btn-primary" onClick={handleExport}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
