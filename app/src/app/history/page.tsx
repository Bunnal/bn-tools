"use client";

import styles from "./page.module.css";

// Mock data for demonstration
const recentActivity = [
  { id: 1, name: "sunset_landscape.png", type: "IMAGE", details: "3840×2160", status: "Completed", date: "2 mins ago" },
  { id: 2, name: "nyc_vlog_raw.mp4", type: "VIDEO", details: "1080p • 02:14", status: "Processing (84%)", date: "15 mins ago" },
  { id: 3, name: "gemini_portrait.png", type: "IMAGE", details: "2048×2048", status: "Completed", date: "1 hour ago" },
  { id: 4, name: "product_demo.mp4", type: "VIDEO", details: "4K • 00:32", status: "Completed", date: "3 hours ago" },
];

export default function HistoryPage() {
  return (
    <div className={styles.page}>
      {/* ── Quick Actions ─────────────────────────── */}
      <section className={styles.section}>
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
            <button className="btn btn-primary" style={{ marginTop: "auto" }}>Start</button>
          </a>

          <a href="/video" className={styles.quickCard}>
            <div className={styles.quickIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
            </div>
            <div>
              <h3 className={styles.quickTitle}>Remove Video Watermark</h3>
              <p className={styles.quickDesc}>Frame-by-frame precision cleaning for video files.</p>
            </div>
            <button className="btn btn-primary" style={{ marginTop: "auto" }}>Start</button>
          </a>
        </div>
      </section>

      {/* ── Recent Activity ───────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <span className={styles.colFile}>File</span>
            <span className={styles.colType}>Type</span>
            <span className={styles.colDetails}>Details</span>
            <span className={styles.colStatus}>Status</span>
            <span className={styles.colDate}>Date</span>
            <span className={styles.colActions}>Actions</span>
          </div>
          {recentActivity.map((item) => (
            <div key={item.id} className={styles.tableRow}>
              <span className={styles.colFile}>
                <div className={styles.fileThumbnail}>
                  {item.type === "IMAGE" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
                  )}
                </div>
                <span className={styles.fileName}>{item.name}</span>
              </span>
              <span className={styles.colType}>
                <span className={`${styles.typeBadge} ${item.type === "IMAGE" ? styles.typeBadgeGreen : styles.typeBadgeBlue}`}>
                  {item.type}
                </span>
              </span>
              <span className={styles.colDetails}>{item.details}</span>
              <span className={styles.colStatus}>
                {item.status === "Completed" ? (
                  <span className={styles.statusCompleted}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    Completed
                  </span>
                ) : (
                  <span className={styles.statusProcessing}>
                    <span className={styles.spinner} />
                    {item.status}
                  </span>
                )}
              </span>
              <span className={styles.colDate}>{item.date}</span>
              <span className={styles.colActions}>
                <button className="btn-icon btn-ghost" type="button" title="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button className="btn-icon btn-ghost" type="button" title="More options">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Usage Stats ───────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className="label">IMAGES PROCESSED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>47</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="label">VIDEOS PROCESSED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>12</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="label">TOTAL SAVED</span>
            <div className={styles.statValue}>
              <span className={styles.statNumber}>2.4 <span className={styles.statUnit}>GB</span></span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
