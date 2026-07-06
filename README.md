# PixelClean — AI Gemini Watermark Remover

PixelClean is a web-based, AI-powered tool designed to detect and remove Gemini watermarks from images and videos. **All processing runs 100% locally in your browser** via WebGPU and WebAssembly — ensuring complete privacy with zero server uploads.

## ✨ Core Features
- **Image Studio**: Instantly detect and remove visible or imperceptible AI watermarks from images.
- **Video Studio**: Frame-by-frame processing using high-speed WebCodecs and Mediabunny.
- **Multi-Resolution Export**: Export cleaned media in HD (1080p), 2K (1440p), or 4K (2160p).
- **Audio & Loop Extension**: Easily loop short clips or attach custom background audio tracks.
- **Dashboard & History**: Track recent exports, storage usage, and manage your local processing history via IndexedDB.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm or yarn

### Installation & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to use PixelClean.

## 📁 Repository Structure

```
gemini-watermark-remover-web/
├── README.md                ← Project documentation
├── LICENSE                  ← Open source license
├── .gitignore               ← Git ignore rules
├── docs/                    ← Architecture & technical docs
│   └── ui/                  ← UI mockup references
├── src/                     ← Next.js application source
│   ├── app/                 ← App Router pages & layouts
│   ├── engine/              ← Watermark detection & removal core
│   ├── lib/                 ← IndexedDB & utility helpers
│   └── store/               ← React state management
├── tests/                   ← Automated verification tests
├── Dockerfile               ← Docker build configuration
├── docker-compose.yml       ← Multi-container orchestration
├── .github/                 ← GitHub workflows & CI/CD
└── examples/                ← Usage examples & sample assets
```

## 🛡️ Privacy & Technology
PixelClean leverages `@pilio/gemini-watermark-remover`, ONNX Runtime Web, and Mediabunny to process media entirely client-side. Your files never leave your device.
