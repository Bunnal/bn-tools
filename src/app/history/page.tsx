"use client";

import { useHistory } from "@/store/HistoryContext";
import styles from "./page.module.css";

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatStatBytes(bytes: number): { value: string; unit: string } {
  if (bytes < 1024 * 1024) return { value: `${(bytes / 1024).toFixed(0)}`, unit: "KB" };
  if (bytes < 1024 * 1024 * 1024) return { value: `${(bytes / (1024 * 1024)).toFixed(1)}`, unit: "MB" };
  return { value: `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}`, unit: "GB" };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function HistoryPage() {
  const { records, stats, loaded, removeRecord, clearAll } = useHistory();

  return (
    <div className={styles.page}>
      {/* ── Quick Actions ─────────────────────────── */}
      <section className={`${styles.section} animate-fade-in`}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickGrid}>
          <a href="/image" className={styles.quickCard}>
            <div className={styles.quickIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
            <div>
              <h3 className={styles.quickTitle}>Remove Image Watermark</h3>
              <p className={styles.quickDesc}>AI-powered watermark removal for high-res images.</p>
            </div>
            <span className="btn btn-primary" style={{ marginTop: "auto" }}>Start</span>
          </a>

          <a href="/video" className={styles.quickCard}>
            <div className={styles.quickIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
            </div>
            <div>
              <h3 className={styles.quickTitle}>Remove Video Watermark</h3>
              <p className={styles.quickDesc}>Frame-by-frame precision cleaning for video files.</p>
            </div>
            <span className="btn btn-primary" style={{ marginTop: "auto" }}>Start</span>
          </a>
        </div>
      </section>

      {/* ── Recent Activity ───────────────────────── */}
      <section className={`${styles.section} animate-fade-in`} style={{ animationDelay: "100ms" }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          {records.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => { if (confirm("Clear all processing history?")) clearAll(); }}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Clear All
            </button>
          )}
        </div>

        {!loaded ? (
          <div className={styles.emptyState}>
            <div className={styles.loadingSpinner} />
            <p className={styles.emptyText}>Loading history…</p>
          </div>
        ) : records.length === 0 ? (
          <div className={styles.emptyState}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p className={styles.emptyTitle}>No processing history yet</p>
            <p className={styles.emptyText}>Process an image or video to see it appear here.</p>
            <div className={styles.emptyActions}>
              <a href="/image" className="btn btn-primary">Process Image</a>
              <a href="/video" className="btn btn-outline">Process Video</a>
            </div>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <span className={styles.colFile}>File</span>
              <span className={styles.colType}>Type</span>
              <span className={styles.colDetails}>Details</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colDate}>Date</span>
              <span className={styles.colActions}>Actions</span>
            </div>
            {records.map((item, idx) => (
              <div
                key={item.id}
                className={styles.tableRow}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <span className={styles.colFile}>
                  <div className={styles.fileThumbnail}>
                    {item.fileType === "image" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
                    )}
                  </div>
                  <span className={styles.fileName}>{item.fileName}</span>
                </span>
                <span className={styles.colType}>
                  <span className={`${styles.typeBadge} ${item.fileType === "image" ? styles.typeBadgeGreen : styles.typeBadgeBlue}`}>
                    {item.fileType.toUpperCase()}
                  </span>
                </span>
                <span className={styles.colDetails}>
                  {item.dimensions}
                  {item.duration ? ` • ${item.duration}` : ""}
                  {item.outputSize ? ` • ${formatBytes(item.outputSize)}` : ""}
                </span>
                <span className={styles.colStatus}>
                  {item.status === "completed" ? (
                    <span className={styles.statusCompleted}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      Completed
                    </span>
                  ) : (
                    <span className={styles.statusFailed}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      Failed
                    </span>
                  )}
                </span>
                <span className={styles.colDate}>{relativeTime(item.createdAt)}</span>
                <span className={styles.colActions}>
                  <button
                    className="btn-icon btn-ghost"
                    type="button"
                    title="Delete record"
                    onClick={() => removeRecord(item.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Usage Stats ───────────────────────────── */}
      <section className={`${styles.section} animate-fade-in`} style={{ animationDelay: "200ms" }}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className="label">IMAGES PROCESSED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>{stats.imagesProcessed}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="label">VIDEOS PROCESSED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>{stats.videosProcessed}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="label">TOTAL SAVED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>
                {formatStatBytes(stats.totalOutputBytes).value}{" "}
                <span className={styles.statUnit}>{formatStatBytes(stats.totalOutputBytes).unit}</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
