"use client";

import { usePathname } from "next/navigation";

const links = [
  { href: "/image", label: "Image Studio" },
  { href: "/video", label: "Video Studio" },
  { href: "/history", label: "History" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {links.map((l) => {
        const isActive = pathname === l.href;
        return (
          <a
            key={l.href}
            href={l.href}
            className={`nav-link${isActive ? " nav-link-active" : ""}`}
          >
            {l.label}
          </a>
        );
      })}

      <style>{`
        .nav {
          display: flex;
          gap: var(--space-6);
        }
        .nav-link {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          transition: color var(--duration-fast);
          position: relative;
          padding-bottom: 2px;
        }
        .nav-link:hover {
          color: var(--text-primary);
        }
        .nav-link-active {
          color: var(--accent) !important;
          font-weight: 600;
        }
        .nav-link-active::after {
          content: '';
          position: absolute;
          bottom: -20px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent);
          border-radius: 2px 2px 0 0;
          animation: navIndicator 0.25s var(--ease-out) both;
        }
        @keyframes navIndicator {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </nav>
  );
}
