/**
 * PixelClean — IndexedDB History Storage
 *
 * Zero-dependency wrapper around the raw IndexedDB API.
 * Stores processing records so the Dashboard can show live data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessingRecord {
  id: string;
  fileName: string;
  fileType: "image" | "video";
  fileSize: number;           // input file size in bytes
  dimensions: string;         // e.g. "3840×2160" or "1920×1080"
  duration?: string;          // video only, e.g. "02:14"
  status: "completed" | "failed";
  createdAt: number;          // Date.now()
  completedAt: number;
  outputSize: number;         // output file size in bytes
  settings: Record<string, unknown>;
}

export interface HistoryStats {
  imagesProcessed: number;
  videosProcessed: number;
  totalOutputBytes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = "pixelclean";
const DB_VERSION = 1;
const STORE_NAME = "history";

// ---------------------------------------------------------------------------
// Open / Upgrade
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("fileType", "fileType", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

/** Add a new processing record. */
export async function addRecord(record: ProcessingRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Get all records, newest first. */
export async function getRecords(): Promise<ProcessingRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("createdAt");
    const req = idx.getAll();
    req.onsuccess = () => {
      db.close();
      // reverse so newest is first
      resolve((req.result as ProcessingRecord[]).reverse());
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Delete a single record by id. */
export async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Clear all history records. */
export async function clearHistory(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Compute aggregate stats from all records. */
export async function getStats(): Promise<HistoryStats> {
  const records = await getRecords();
  const stats: HistoryStats = {
    imagesProcessed: 0,
    videosProcessed: 0,
    totalOutputBytes: 0,
  };
  for (const r of records) {
    if (r.status !== "completed") continue;
    if (r.fileType === "image") stats.imagesProcessed++;
    else if (r.fileType === "video") stats.videosProcessed++;
    stats.totalOutputBytes += r.outputSize || 0;
  }
  return stats;
}
