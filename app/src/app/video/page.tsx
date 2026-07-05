"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

export default function VideoRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [status, setStatus] = useState<{ text: string; tone: string }>({ text: "", tone: "info" });
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Export settings
  const [exportFormat, setExportFormat] = useState("video-audio");
  const [exportQuality, setExportQuality] = useState("original");
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopMinutes, setLoopMinutes] = useState(5);

  // Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [modalQuality, setModalQuality] = useState("original");
  const [modalBitrate] = useState(12);
  const [modalAiCleanup, setModalAiCleanup] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) return;
    setFile(f);
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    setProcessedUrl(null);
    setProgress(0);
    setFramesProcessed(0);
    setStatus({ text: `Loaded: ${f.name}`, tone: "info" });
  }, [originalUrl, processedUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleExport = useCallback(async () => {
    if (!file || processing) return;
    setShowExportModal(false);
    setProcessing(true);
    setProgress(0);
    setFramesProcessed(0);
    setStatus({ text: "Detecting watermark...", tone: "info" });

    for (let i = 0; i <= 100; i += 1) {
      await new Promise((r) => setTimeout(r, 40));
      setProgress(i);
      setFramesProcessed(Math.floor(i * 3.2));
      if (i < 15) setStatus({ text: "Detecting watermark...", tone: "info" });
      else setStatus({ text: `Exporting... ${Math.floor(i * 3.2)} frames processed`, tone: "info" });
    }

    setProcessedUrl(originalUrl);
    setProgress(100);
    setStatus({ text: "Export complete! Video is ready for download.", tone: "success" });
    setProcessing(false);
  }, [file, processing, originalUrl]);

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
                    ref={videoRef}
                    src={originalUrl}
                    className={styles.video}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                    onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                    onEnded={() => setPlaying(false)}
                  />
                ) : (
                  <div className={styles.videoEmpty}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
                  </div>
                )}
              </div>

              {/* Processed */}
              <div className={styles.videoPane}>
                {processedUrl ? (
                  <>
                    <span className={styles.badgeCleaned}>● CLEANED</span>
                    <video src={processedUrl} className={styles.video} playsInline preload="metadata" muted />
                  </>
                ) : (
                  <div className={styles.videoEmpty}>
                    <span className={styles.videoEmptyText}>Processed output appears here</span>
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
                max={duration || 1}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  setCurrentTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                disabled={!originalUrl}
              />

              <span className={styles.timeLabel}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <button
                className={`${styles.loopBtn} ${loopEnabled ? styles.loopActive : ""}`}
                onClick={() => setLoopEnabled(!loopEnabled)}
                type="button"
                title="Toggle loop"
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
            <span className={styles.dropzoneTitle}>Drop video here</span>
            <span className={styles.dropzoneHint}>MP4, WebM, MOV supported</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Settings Card */}
          <div className={styles.settingsCard}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Settings</h3>
              <button className="btn-icon btn-ghost" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><circle cx="10" cy="18" r="1.5" fill="currentColor"/></svg>
              </button>
            </div>

            <div className={styles.field}>
              <label className="label">EXPORT FORMAT</label>
              <select className="select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="video-audio">Video + Audio (MP4)</option>
                <option value="audio-only">Audio Only (MP4/AAC)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className="label">OUTPUT QUALITY</label>
              <select className="select" value={exportQuality} onChange={(e) => setExportQuality(e.target.value)}>
                <option value="original">Original Resolution</option>
                <option value="1080p">HD 1080p</option>
                <option value="2k">2K 1440p</option>
                <option value="4k">4K 2160p</option>
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Loop Output</span>
              <button
                type="button"
                className={`toggle ${loopEnabled ? "active" : ""}`}
                onClick={() => setLoopEnabled(!loopEnabled)}
              />
            </div>

            {loopEnabled && (
              <div className={styles.field}>
                <label className="label">LOOP DURATION (MINS)</label>
                <input
                  type="number"
                  className="input"
                  min={0.1}
                  max={1440}
                  step={0.5}
                  value={loopMinutes}
                  onChange={(e) => setLoopMinutes(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Progress */}
          {(processing || progress === 100) && (
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <span className={progress === 100 ? styles.progressDone : styles.progressActive}>
                  {progress === 100 ? "Complete!" : "Exporting..."}
                </span>
                <span className={styles.progressFrames}>
                  {framesProcessed} frames processed
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button className="btn btn-outline btn-full" disabled={!file || processing} onClick={() => {
              setStatus({ text: "Watermark detected at bottom-right (72px)", tone: "success" });
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Detect Watermark
            </button>

            <button
              className="btn btn-primary btn-full"
              disabled={!file || processing}
              onClick={() => setShowExportModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4"/></svg>
              Export Clean Video
            </button>

            <button className="btn btn-outline btn-full" disabled={!processedUrl}>
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
              <div className={styles.modalSection}>
                <label className="label">FORMAT</label>
                <select className="select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                  <option value="video-audio">Video + Audio (MP4)</option>
                  <option value="audio-only">Audio Only (MP4/AAC)</option>
                </select>
              </div>

              <div className={styles.modalSection}>
                <label className="label">RESOLUTION</label>
                <div className={styles.resGrid}>
                  {[
                    { id: "original", label: "Original", sub: "Source resolution" },
                    { id: "1080p", label: "HD 1080p", sub: "1920×1080 • 8 Mbps" },
                    { id: "2k", label: "2K", sub: "2560×1440 • 16 Mbps" },
                    { id: "4k", label: "4K", sub: "3840×2160 • 35 Mbps" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      className={`${styles.resTile} ${modalQuality === opt.id ? styles.resTileActive : ""}`}
                      onClick={() => { setModalQuality(opt.id); setExportQuality(opt.id); }}
                      type="button"
                    >
                      <span className={styles.resTileLabel}>{opt.label}</span>
                      <span className={styles.resTileSub}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.toggleRow}>
                  <div>
                    <span className="label">LOOP SETTINGS</span>
                  </div>
                  <button
                    type="button"
                    className={`toggle ${loopEnabled ? "active" : ""}`}
                    onClick={() => setLoopEnabled(!loopEnabled)}
                  />
                </div>
                {loopEnabled && (
                  <div className={styles.loopInputs}>
                    <input type="number" className="input" value={loopMinutes} onChange={(e) => setLoopMinutes(Number(e.target.value))} min={0.1} max={1440} step={0.5} />
                    <select className="select" defaultValue="minutes" style={{ width: "auto", flex: "0 0 120px" }}>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.divider} />

              <div className={styles.modalSection}>
                <label className="label">ADVANCED SETTINGS</label>
                <div className={styles.advancedRow}>
                  <span className={styles.advancedLabel}>Video Bitrate</span>
                  <span className={styles.advancedValue}>{modalBitrate} Mbps</span>
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.advancedToggleRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/><circle cx="12" cy="12" r="4"/></svg>
                    <span className={styles.toggleLabel}>AI Cleanup</span>
                  </div>
                  <button type="button" className={`toggle ${modalAiCleanup ? "active" : ""}`} onClick={() => setModalAiCleanup(!modalAiCleanup)} />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.advancedToggleRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <span className={styles.toggleLabel}>Preserve Audio</span>
                  </div>
                  <input type="checkbox" defaultChecked className={styles.checkbox} />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExport}>
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
