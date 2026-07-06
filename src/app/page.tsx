import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            Remove Gemini Watermarks{" "}
            <span className={styles.headlineAccent}>Instantly</span>
          </h1>
          <p className={styles.subtitle}>
            AI-powered watermark removal for images and videos. Process locally
            in your browser. No uploads. No servers.
          </p>
          <div className={styles.ctas}>
            <a href="/image" className="btn btn-primary btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              Remove Image Watermark
            </a>
            <a href="/video" className="btn btn-outline btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="m10 8 6 4-6 4V8z"/></svg>
              Remove Video Watermark
            </a>
          </div>
        </div>

        {/* Before / After Preview */}
        <div className={styles.previewWrapper}>
          <div className={styles.preview}>
            <div className={styles.previewPane}>
              <div className={styles.previewPlaceholder}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                <span>Original (with watermark)</span>
              </div>
            </div>
            <div className={styles.previewDivider}>
              <div className={styles.previewDividerHandle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3l-5 9 5 9"/><path d="M16 3l5 9-5 9"/></svg>
              </div>
            </div>
            <div className={styles.previewPane}>
              <div className={styles.previewPlaceholder}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                <span style={{ color: "var(--accent)" }}>Cleaned (watermark removed)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────── */}
      <section className={styles.features}>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3 className={styles.featureTitle}>100% Private</h3>
            <p className={styles.featureDesc}>
              All processing happens locally in your browser. Your files never
              leave your device.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3 className={styles.featureTitle}>AI-Powered</h3>
            <p className={styles.featureDesc}>
              Advanced neural network removes watermarks while preserving image
              quality.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <h3 className={styles.featureTitle}>HD to 4K Export</h3>
            <p className={styles.featureDesc}>
              Export your clean videos in HD, 2K, or 4K resolution with loop
              support.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
