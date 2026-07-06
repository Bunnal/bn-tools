import type { Metadata } from "next";
import "./globals.css";
import { HistoryProvider } from "@/store/HistoryContext";
import { NavLinks } from "./NavLinks";

export const metadata: Metadata = {
  title: "PixelClean — AI Gemini Watermark Remover",
  description:
    "Remove Gemini watermarks from images and videos instantly. AI-powered, 100% local processing. Export in HD, 2K, or 4K.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <HistoryProvider>
          <Header />
          <main className="page-transition">{children}</main>
          <Footer />
        </HistoryProvider>
      </body>
    </html>
  );
}

/* ── Header ─────────────────────────────────────────────────── */
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <a href="/" className="logo">
            PixelClean
          </a>
          <NavLinks />
        </div>
        <div className="header-right">
          <a href="/video" className="btn btn-primary" style={{ height: 36, padding: "0 16px", fontSize: "0.85rem" }}>
            Export
          </a>
        </div>
      </div>

      <style>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: var(--header-height);
          background: rgba(10, 15, 26, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .header-inner {
          max-width: var(--max-width);
          margin: 0 auto;
          height: 100%;
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-8);
        }
        .logo {
          font-size: var(--text-xl);
          font-weight: 800;
          color: var(--accent);
          letter-spacing: -0.02em;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        @media (max-width: 640px) {
          .nav { display: none; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-status">
          <span className="footer-dot" />
          System Status: WebGPU Optimized | WASM: Active
        </span>
        <div className="footer-right">
          <span>Local Processing: ON</span>
          <span>GPU Usage: 12%</span>
        </div>
      </div>

      <style>{`
        .footer {
          border-top: 1px solid var(--border);
          background: var(--bg-surface);
          padding: var(--space-3) 0;
        }
        .footer-inner {
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 var(--space-6);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .footer-status {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--accent);
          font-weight: 600;
        }
        .footer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 8px var(--accent);
          animation: pulse 2s ease-in-out infinite;
        }
        .footer-right {
          display: flex;
          gap: var(--space-6);
        }
        @media (max-width: 640px) {
          .footer-right { display: none; }
        }
      `}</style>
    </footer>
  );
}
