"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import type { ProcessingRecord, HistoryStats } from "@/lib/db";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface HistoryState {
  records: ProcessingRecord[];
  stats: HistoryStats;
  loaded: boolean;
}

const INITIAL_STATE: HistoryState = {
  records: [],
  stats: { imagesProcessed: 0, videosProcessed: 0, totalOutputBytes: 0 },
  loaded: false,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: "SET_RECORDS"; records: ProcessingRecord[]; stats: HistoryStats }
  | { type: "ADD_RECORD"; record: ProcessingRecord }
  | { type: "DELETE_RECORD"; id: string }
  | { type: "CLEAR" };

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "SET_RECORDS":
      return { records: action.records, stats: action.stats, loaded: true };

    case "ADD_RECORD": {
      const records = [action.record, ...state.records];
      const stats = { ...state.stats };
      if (action.record.status === "completed") {
        if (action.record.fileType === "image") stats.imagesProcessed++;
        else stats.videosProcessed++;
        stats.totalOutputBytes += action.record.outputSize || 0;
      }
      return { ...state, records, stats };
    }

    case "DELETE_RECORD": {
      const removed = state.records.find((r) => r.id === action.id);
      const records = state.records.filter((r) => r.id !== action.id);
      const stats = { ...state.stats };
      if (removed?.status === "completed") {
        if (removed.fileType === "image") stats.imagesProcessed = Math.max(0, stats.imagesProcessed - 1);
        else stats.videosProcessed = Math.max(0, stats.videosProcessed - 1);
        stats.totalOutputBytes = Math.max(0, stats.totalOutputBytes - (removed.outputSize || 0));
      }
      return { ...state, records, stats };
    }

    case "CLEAR":
      return { ...INITIAL_STATE, loaded: true };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface HistoryContextValue extends HistoryState {
  addRecord: (record: ProcessingRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Load records on mount (dynamic import avoids SSR issues with IndexedDB)
  useEffect(() => {
    (async () => {
      try {
        const db = await import("@/lib/db");
        const [records, stats] = await Promise.all([db.getRecords(), db.getStats()]);
        dispatch({ type: "SET_RECORDS", records, stats });
      } catch {
        dispatch({ type: "SET_RECORDS", records: [], stats: INITIAL_STATE.stats });
      }
    })();
  }, []);

  const addRecord = useCallback(async (record: ProcessingRecord) => {
    try {
      const db = await import("@/lib/db");
      await db.addRecord(record);
      dispatch({ type: "ADD_RECORD", record });
    } catch (err) {
      console.error("Failed to save history record:", err);
    }
  }, []);

  const removeRecord = useCallback(async (id: string) => {
    try {
      const db = await import("@/lib/db");
      await db.deleteRecord(id);
      dispatch({ type: "DELETE_RECORD", id });
    } catch (err) {
      console.error("Failed to delete history record:", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      const db = await import("@/lib/db");
      await db.clearHistory();
      dispatch({ type: "CLEAR" });
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  }, []);

  return (
    <HistoryContext.Provider value={{ ...state, addRecord, removeRecord, clearAll }}>
      {children}
    </HistoryContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used inside <HistoryProvider>");
  return ctx;
}
