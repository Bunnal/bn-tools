"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./page.module.css";

type PromptResult = {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  mood?: string;
  composition?: string;
  lighting?: string;
  colorPalette?: string;
  suggestedTools?: string[];
  raw?: boolean;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function PromptStudioPage() {
  const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }
    setUploadedFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleUrlChange = (val: string) => {
    setImageUrl(val);
    setResult(null);
    setError(null);
    if (previewUrl && activeTab === "url") {
      setPreviewUrl(null);
    }
  };

  const handleUrlPreview = () => {
    if (!imageUrl.trim()) return;
    setPreviewUrl(imageUrl.trim());
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let body: Record<string, string>;

      if (activeTab === "url") {
        if (!imageUrl.trim()) {
          setError("Please enter an image URL.");
          setLoading(false);
          return;
        }
        body = { imageUrl: imageUrl.trim() };
      } else {
        if (!uploadedFile) {
          setError("Please upload an image file.");
          setLoading(false);
          return;
        }
        const base64 = await fileToBase64(uploadedFile);
        body = { imageBase64: base64, mimeType: uploadedFile.type };
      }

      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned unexpected response: ${rawText.slice(0, 120)}`);
      }

      if (!res.ok) {
        throw new Error(String(data.error || "Failed to generate prompt."));
      }

      setResult(data as PromptResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const handleReset = () => {
    setImageUrl("");
    setUploadedFile(null);
    if (previewUrl && uploadedFile) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const hasInput =
    activeTab === "url" ? imageUrl.trim() !== "" : uploadedFile !== null;

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ─────────────────────────────── */}
      <div className={styles.breadcrumb}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className={styles.breadcrumbActive}>Prompt Studio</span>
        <span className={styles.breadcrumbSep}>›</span>
        <a href="/image" className={styles.breadcrumbLink}>Image Remover</a>
        <span className={styles.breadcrumbSep}>›</span>
        <a href="/video" className={styles.breadcrumbLink}>Video Remover</a>
      </div>

      <div className={styles.header}>
        <div className={styles.headerBadge}>
          <span className={styles.headerBadgeDot} />
          Gemini Vision
        </div>
        <h1 className={styles.title}>Image Prompt Generator</h1>
        <p className={styles.subtitle}>
          Provide an image and get a production-ready AI generation prompt.
          Works with Midjourney, DALL·E, Stable Diffusion, and Imagen.
        </p>
      </div>

      <div className={styles.layout}>
        {/* ── Left: Input ─────────────────────────── */}
        <div className={styles.inputSection}>
          {/* Tab Switcher */}
          <div className={styles.tabs}>
            <button
              id="tab-url"
              className={`${styles.tab} ${activeTab === "url" ? styles.tabActive : ""}`}
              onClick={() => { setActiveTab("url"); setResult(null); setError(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Image URL
            </button>
            <button
              id="tab-upload"
              className={`${styles.tab} ${activeTab === "upload" ? styles.tabActive : ""}`}
              onClick={() => { setActiveTab("upload"); setResult(null); setError(null); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Image
            </button>
          </div>

          {/* URL Tab */}
          {activeTab === "url" && (
            <div className={styles.urlCard}>
              <label className={styles.fieldLabel}>IMAGE URL</label>
              <div className={styles.urlInputRow}>
                <input
                  id="image-url-input"
                  type="url"
                  className={styles.urlInput}
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlPreview()}
                />
                <button
                  id="preview-url-btn"
                  className={styles.previewBtn}
                  onClick={handleUrlPreview}
                  disabled={!imageUrl.trim()}
                >
                  Preview
                </button>
              </div>
              <p className={styles.urlHint}>
                Paste any publicly accessible image URL. Press Enter or click Preview.
              </p>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div
              id="dropzone"
              className={`${styles.dropzone} ${dragging ? styles.dropzoneDragging : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <svg className={styles.dropzoneIcon} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadedFile ? (
                <>
                  <span className={styles.dropzoneTitle} style={{ color: "var(--accent)" }}>
                    {uploadedFile.name}
                  </span>
                  <span className={styles.dropzoneHint}>
                    {(uploadedFile.size / 1024).toFixed(0)} KB · Click to change
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.dropzoneTitle}>Drop image here</span>
                  <span className={styles.dropzoneHint}>PNG, JPG, WebP, GIF up to 20 MB</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {/* Image Preview */}
          {previewUrl && (
            <div className={styles.previewCard}>
              <div className={styles.previewLabel}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Preview
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className={styles.previewImg}
                onError={() => {
                  setError("Could not load image from that URL. Make sure it's a direct image link.");
                  setPreviewUrl(null);
                }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorBox} role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            id="generate-prompt-btn"
            className={`${styles.generateBtn} ${loading ? styles.generateBtnLoading : ""}`}
            onClick={handleGenerate}
            disabled={!hasInput || loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Analyzing with Gemini Vision...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Generate Prompt
              </>
            )}
          </button>

          {(result || uploadedFile || imageUrl) && (
            <button className={styles.resetBtn} onClick={handleReset}>
              Reset
            </button>
          )}
        </div>

        {/* ── Right: Result ───────────────────────── */}
        <div className={styles.resultSection}>
          {!result && !loading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyGlow} />
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.25">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <p className={styles.emptyTitle}>Your prompt will appear here</p>
              <p className={styles.emptyHint}>Provide an image and click Generate Prompt to start</p>
            </div>
          )}

          {loading && (
            <div className={styles.emptyState}>
              <div className={styles.emptyGlow} />
              <div className={styles.loadingPulse}>
                <div className={styles.loadingRing} />
                <div className={styles.loadingRing} style={{ animationDelay: "0.3s" }} />
                <div className={styles.loadingRing} style={{ animationDelay: "0.6s" }} />
              </div>
              <p className={styles.emptyTitle}>Gemini is analyzing your image…</p>
              <p className={styles.emptyHint}>This usually takes 3–8 seconds</p>
            </div>
          )}

          {result && (
            <div className={styles.resultCard}>
              {/* Main Prompt */}
              <div className={styles.promptBlock}>
                <div className={styles.promptBlockHeader}>
                  <span className={styles.promptBlockLabel}>✦ GENERATION PROMPT</span>
                  <button
                    id="copy-prompt-btn"
                    className={`${styles.copyBtn} ${copied === "prompt" ? styles.copyBtnSuccess : ""}`}
                    onClick={() => copyToClipboard(result.prompt, "prompt")}
                  >
                    {copied === "prompt" ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className={styles.promptText}>{result.prompt}</p>
              </div>

              {/* Metadata Tags */}
              <div className={styles.metaGrid}>
                {result.style && (
                  <div className={styles.metaTag}>
                    <span className={styles.metaTagLabel}>Style</span>
                    <span className={styles.metaTagValue}>{result.style}</span>
                  </div>
                )}
                {result.mood && (
                  <div className={styles.metaTag}>
                    <span className={styles.metaTagLabel}>Mood</span>
                    <span className={styles.metaTagValue}>{result.mood}</span>
                  </div>
                )}
                {result.lighting && (
                  <div className={styles.metaTag}>
                    <span className={styles.metaTagLabel}>Lighting</span>
                    <span className={styles.metaTagValue}>{result.lighting}</span>
                  </div>
                )}
                {result.composition && (
                  <div className={styles.metaTag}>
                    <span className={styles.metaTagLabel}>Composition</span>
                    <span className={styles.metaTagValue}>{result.composition}</span>
                  </div>
                )}
                {result.colorPalette && (
                  <div className={styles.metaTag}>
                    <span className={styles.metaTagLabel}>Colors</span>
                    <span className={styles.metaTagValue}>{result.colorPalette}</span>
                  </div>
                )}
              </div>

              {/* Negative Prompt */}
              {result.negativePrompt && (
                <div className={styles.negativeBlock}>
                  <div className={styles.negativeBlockHeader}>
                    <span className={styles.negativeBlockLabel}>✕ NEGATIVE PROMPT</span>
                    <button
                      id="copy-negative-btn"
                      className={`${styles.copyBtn} ${copied === "negative" ? styles.copyBtnSuccess : ""}`}
                      onClick={() => copyToClipboard(result.negativePrompt!, "negative")}
                    >
                      {copied === "negative" ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className={styles.negativeText}>{result.negativePrompt}</p>
                </div>
              )}

              {/* Suggested Tools */}
              {result.suggestedTools && result.suggestedTools.length > 0 && (
                <div className={styles.toolsRow}>
                  <span className={styles.toolsLabel}>Works best with</span>
                  <div className={styles.toolChips}>
                    {result.suggestedTools.map((t) => (
                      <span key={t} className={styles.toolChip}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy All */}
              <button
                id="copy-all-btn"
                className={`${styles.copyAllBtn} ${copied === "all" ? styles.copyAllBtnSuccess : ""}`}
                onClick={() => {
                  const allText = [
                    `Prompt: ${result.prompt}`,
                    result.negativePrompt ? `\nNegative Prompt: ${result.negativePrompt}` : "",
                    result.style ? `\nStyle: ${result.style}` : "",
                    result.mood ? `\nMood: ${result.mood}` : "",
                    result.lighting ? `\nLighting: ${result.lighting}` : "",
                    result.composition ? `\nComposition: ${result.composition}` : "",
                    result.colorPalette ? `\nColor Palette: ${result.colorPalette}` : "",
                  ].join("").trim();
                  copyToClipboard(allText, "all");
                }}
              >
                {copied === "all" ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    All Copied!
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy All Details
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
