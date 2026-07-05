# PixelClean — System Architecture & Implementation Plan

## 1. Project Overview

**PixelClean** is a web-based AI-powered Gemini watermark remover. All processing runs locally in the browser — no server uploads, no backend required.

### Core Features
| Feature | Description |
|---|---|
| **Image Watermark Removal** | Detect and remove Gemini watermarks from AI-generated images |
| **Video Watermark Removal** | Frame-by-frame AI processing with WebCodecs + Mediabunny |
| **Loop Video/Audio** | Extend output to any target duration (minutes to hours) |
| **Multi-Resolution Export** | Export in HD 1080p, 2K 1440p, or 4K 2160p |
| **Processing History** | Dashboard with recent files and usage stats |

---

## 2. UI Reference (From Stitch)

See `ui/` folder:
- `01_landing.jpg` — Landing page
- `02_image_remover.jpg` — Image remover workspace
- `03_video_remover.jpg` — Video remover workspace
- `04_export_panel.jpg` — Export settings modal
- `05_dashboard.jpg` — Dashboard / history

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | SSR landing page for SEO, client-side SPA for tools |
| **Language** | TypeScript | Type safety across processing pipeline |
| **Styling** | Vanilla CSS (custom properties) | Full control to match Stitch dark theme exactly |
| **Font** | Inter (Google Fonts) | Matches UI mockups |
| **Video Decode** | WebCodecs API | Native browser video frame access |
| **Video Mux** | Mediabunny | MP4 mux/demux in browser |
| **AI Inference** | ONNX Runtime (WASM) | Local FDnCNN neural network for cleanup |
| **State** | React Context + useReducer | Lightweight, no external dependency |
| **Storage** | IndexedDB (idb-keyval) | Processing history persistence |

---

## 4. Application Architecture

```
Pages:
  / (Landing) ──────────────────────────────────────┐
  /image (Image Remover) ──────┐                    │
  /video (Video Remover) ──────┤── Core Engine      │── Shared Layout
  /history (Dashboard) ────────┘   │                │   (AppShell: Header + Nav)
                                   │                │
                          ┌────────┴────────┐       │
                          │ ImageProcessor   │       │
                          │ VideoProcessor   │       │
                          │ ExportEngine     │       │
                          │ LoopEngine       │       │
                          └────────┬────────┘       │
                                   │                │
                          ┌────────┴────────┐       │
                          │ AI Pipeline      │       │
                          │ WatermarkDetector│       │
                          │ AlphaMapGen      │       │
                          │ FDnCNN ONNX      │       │
                          │ ResidualCleanup  │       │
                          └────────┬────────┘       │
                                   │                │
                          ┌────────┴────────┐       │
                          │ Storage          │───────┘
                          │ IndexedDB History│
                          │ Blob URL Manager │
                          └─────────────────┘
```

---

## 5. Page Routing & Component Map

### 5.1 Routes

| Route | Page | Layout |
|---|---|---|
| `/` | Landing | Full-width hero + features |
| `/image` | Image Remover | Two-column: workspace + sidebar |
| `/video` | Video Remover | Two-column: video player + sidebar |
| `/history` | Dashboard | Single-column centered |

### 5.2 Component Hierarchy

```
app/
├── layout.tsx              ← AppShell (header, nav, footer)
├── page.tsx                ← Landing page
├── image/
│   └── page.tsx            ← Image Remover
├── video/
│   └── page.tsx            ← Video Remover
├── history/
│   └── page.tsx            ← Dashboard
└── components/
    ├── layout/
    │   ├── Header.tsx          ← Sticky nav (PixelClean logo, links, settings)
    │   ├── Footer.tsx          ← System status bar
    │   └── ThemeToggle.tsx     ← Dark/light toggle
    ├── landing/
    │   ├── Hero.tsx            ← Gradient headline, CTAs, before/after preview
    │   └── FeatureCards.tsx    ← 3 feature cards (Private, AI, Export)
    ├── shared/
    │   ├── Dropzone.tsx        ← Drag-and-drop file input
    │   ├── ProgressBar.tsx     ← Thin animated progress
    │   ├── StatusMessage.tsx   ← Color-coded status text
    │   ├── CompareSlider.tsx   ← Before/after image comparison
    │   └── Toggle.tsx          ← Styled toggle switch
    ├── image/
    │   ├── ImageWorkspace.tsx  ← Before/after canvas with compare slider
    │   ├── ImageSidebar.tsx    ← Dropzone, quality, alpha, process/download
    │   └── ProcessingOptions.tsx
    ├── video/
    │   ├── VideoWorkspace.tsx  ← Side-by-side video players
    │   ├── VideoControls.tsx   ← Play/pause, scrubber, time, loop toggle
    │   ├── VideoSidebar.tsx    ← Dropzone, settings, actions
    │   ├── ExportModal.tsx     ← Resolution tiles, loop, advanced settings
    │   └── ExportProgress.tsx  ← Progress bar + frame counter
    └── dashboard/
        ├── QuickActions.tsx    ← Two action cards
        ├── ActivityTable.tsx   ← Recent files table
        └── UsageStats.tsx      ← 3 stat cards
```

---

## 6. Processing Pipeline

### 6.1 Image Pipeline

```
User → Drop image
  → WatermarkDetector (detect position)
  → AlphaMapGenerator (generate template)
  → FDnCNN ONNX (AI cleanup on ROI)
  → ResidualCleanup (polish edges)
  → OutputCanvas (render cleaned result)
  → User (before/after comparison + download)
```

### 6.2 Video Pipeline

```
User → Select video
  → WebCodecs Decoder (sample frames)
  → WatermarkDetector (detect from samples)
  → FrameProcessor (process each frame with AI)
  → LoopEngine (repeat if loop enabled)
  → Mediabunny MP4 Mux (encode at target resolution)
  → Blob Download
  → User (download clean video)
```

---

## 7. Export Engine

### 7.1 Resolution Presets

| Preset | Max Width | Max Height | Default Bitrate |
|---|---|---|---|
| Original | Source | Source | 12 Mbps |
| HD 1080p | 1920 | 1080 | 8 Mbps |
| 2K | 2560 | 1440 | 16 Mbps |
| 4K | 3840 | 2160 | 35 Mbps |

### 7.2 Loop Engine

- Accepts target duration in minutes (0.1 to 1440 = 24 hours)
- Cycles both video frames and audio packets
- Timestamps continuously advance across cycles
- Safety limit: 10,000 cycles max
- Audio codec passthrough (AAC → MP4, no re-encoding)

### 7.3 Export Format Options

| Format | Container | Video | Audio |
|---|---|---|---|
| Video + Audio | MP4 | VP8/H.264 re-encode | AAC passthrough |
| Audio Only | MP4 | None | AAC passthrough |

---

## 8. Design System (Extracted from UI)

### 8.1 Colors

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0f1a;        /* Page background */
  --bg-surface: #0c1117;        /* Cards */
  --bg-surface-2: #161b22;      /* Elevated cards */
  --bg-surface-3: #21262d;      /* Inputs, dropdowns */
  
  /* Accent */
  --accent: #2dd4a8;            /* Emerald green (buttons, highlights) */
  --accent-hover: #22b893;
  --accent-glow: rgba(45, 212, 168, 0.15);
  
  /* Text */
  --text-primary: #e6edf3;
  --text-secondary: #7d8590;
  --text-muted: #484f58;
  
  /* Borders */
  --border: #30363d;
  --border-active: #2dd4a8;
  
  /* Status */
  --success: #3fb950;
  --warning: #d29922;
  --error: #f85149;
  --info: #58a6ff;
}
```

### 8.2 Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  
  --text-xs: 0.75rem;    /* 12px — badges, labels */
  --text-sm: 0.85rem;    /* ~14px — secondary text */
  --text-base: 1rem;     /* 16px — body */
  --text-lg: 1.125rem;   /* 18px — section titles */
  --text-xl: 1.5rem;     /* 24px — page titles */
  --text-hero: clamp(2rem, 5vw, 3.25rem); /* Hero headline */
}
```

### 8.3 Spacing & Radius

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 999px;
  
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
}
```

### 8.4 Glassmorphism

```css
.glass {
  background: rgba(22, 27, 34, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
}
```

---

## 9. State Management

```typescript
// Core application state
interface AppState {
  // Image
  imageFile: File | null;
  imageOriginalUrl: string | null;
  imageProcessedUrl: string | null;
  imageProcessing: boolean;
  imageDetection: WatermarkDetection | null;
  
  // Video
  videoFile: File | null;
  videoOriginalUrl: string | null;
  videoProcessedUrl: string | null;
  videoProcessing: boolean;
  videoDetection: WatermarkDetection | null;
  videoMetadata: VideoMetadata | null;
  
  // Export settings
  exportFormat: 'video-audio' | 'audio-only';
  exportQuality: 'original' | '1080p' | '2k' | '4k';
  loopEnabled: boolean;
  loopDurationMinutes: number;
  videoBitrateMbps: number;
  aiCleanupEnabled: boolean;
  preserveAudio: boolean;
  
  // Progress
  progress: number;
  progressPhase: string;
  statusMessage: string;
  statusTone: 'info' | 'success' | 'warning' | 'error';
  
  // History
  history: ProcessingRecord[];
}
```

---

## 10. Implementation Roadmap

### Phase 1 — Foundation (Days 1–2)
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Set up CSS design system (globals.css with all tokens)
- [ ] Build AppShell layout (Header, Nav, Footer)
- [ ] Implement Landing page with Hero + FeatureCards
- [ ] Set up client-side routing for all 4 pages

### Phase 2 — Image Remover (Days 3–4)
- [ ] Build Dropzone component (drag-and-drop + file picker)
- [ ] Build CompareSlider component (before/after with drag handle)
- [ ] Port image watermark detection engine from existing codebase
- [ ] Port AI cleanup pipeline (alpha map → FDnCNN → residual cleanup)
- [ ] Build ImageSidebar with processing options
- [ ] Wire process + download flow

### Phase 3 — Video Remover (Days 5–7)
- [ ] Build VideoWorkspace with side-by-side players
- [ ] Build VideoControls (play/pause, scrubber, time display)
- [ ] Port video watermark detection (frame sampling + scoring)
- [ ] Port video export engine (WebCodecs → Mediabunny mux)
- [ ] Build ExportModal with resolution tiles + loop settings
- [ ] Implement loop engine for video + audio
- [ ] Wire export progress tracking

### Phase 4 — Dashboard & Polish (Days 8–9)
- [ ] Build Dashboard page (QuickActions, ActivityTable, UsageStats)
- [ ] Implement IndexedDB history storage
- [ ] Add micro-animations and transitions
- [ ] Responsive layout testing (mobile, tablet, desktop)
- [ ] Accessibility audit (keyboard nav, screen readers)

### Phase 5 — Testing & Launch (Day 10)
- [ ] Unit tests for processing pipeline
- [ ] Integration tests for export flows
- [ ] Performance profiling (large video files)
- [ ] Production build optimization
- [ ] Deploy

---

## 11. File Structure

```
gemini-watermark-remover-web/
├── docs/
│   └── architecture.md          ← This document
├── ui/
│   ├── 01_landing.jpg
│   ├── 02_image_remover.jpg
│   ├── 03_video_remover.jpg
│   ├── 04_export_panel.jpg
│   └── 05_dashboard.jpg
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             ← Landing
│   │   ├── globals.css          ← Design system
│   │   ├── image/page.tsx       ← Image Remover
│   │   ├── video/page.tsx       ← Video Remover
│   │   └── history/page.tsx     ← Dashboard
│   ├── components/              ← See §5.2 hierarchy
│   ├── engine/
│   │   ├── imageProcessor.ts
│   │   ├── videoProcessor.ts
│   │   ├── watermarkDetector.ts
│   │   ├── alphaMap.ts
│   │   ├── exportEngine.ts
│   │   ├── loopEngine.ts
│   │   └── onnxRuntime.ts
│   ├── hooks/
│   │   ├── useImageProcessor.ts
│   │   ├── useVideoProcessor.ts
│   │   └── useHistory.ts
│   ├── store/
│   │   ├── AppContext.tsx
│   │   └── types.ts
│   └── lib/
│       ├── db.ts                ← IndexedDB wrapper
│       └── utils.ts
├── public/
│   └── models/                  ← ONNX model files
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Open Questions

1. **Project name**: Keep "PixelClean" as shown in the Stitch UI, or use a different name?
2. **Deployment**: Where will this be hosted? Vercel, Cloudflare Pages, or self-hosted?
3. **Port existing engine**: Should I copy the watermark detection + AI cleanup code from the existing `gemini-watermark-remover` project, or rewrite it clean?
4. **Auth / accounts**: The dashboard shows a user avatar — do you want actual user accounts, or just local-only history?
