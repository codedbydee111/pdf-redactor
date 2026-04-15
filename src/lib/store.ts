import { create } from "zustand";
import type { RedactionRegion, SearchMatch, Tool } from "./types";

export type Theme = "light" | "dark";

interface AppStore {
  // Document state
  docId: string | null;
  filePath: string | null;
  pageCount: number;
  currentPage: number;
  zoom: number;

  // Tool state
  activeTool: Tool;

  // Theme
  theme: Theme;

  // Redaction state
  redactions: RedactionRegion[];
  undoStack: RedactionRegion[][];
  redoStack: RedactionRegion[][];

  // Search state
  searchQuery: string;
  searchResults: SearchMatch[];

  // Navigation — viewport listens to this and scrolls when it changes
  scrollRequest: { page: number; id: number } | null;

  // Actions
  setDocument: (docId: string, filePath: string, pageCount: number) => void;
  closeDocument: () => void;
  setCurrentPage: (page: number) => void;
  scrollToPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setActiveTool: (tool: Tool) => void;

  addRedaction: (region: Omit<RedactionRegion, "id">) => string;
  removeRedaction: (id: string) => void;
  clearRedactions: () => void;
  undo: () => void;
  redo: () => void;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchMatch[]) => void;

  toggleTheme: () => void;
}

let nextRedactionId = 1;

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("pdf-redactor-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* localStorage unavailable */ }
  return "light";
}

export const useAppStore = create<AppStore>((set, get) => ({
  docId: null,
  filePath: null,
  pageCount: 0,
  currentPage: 0,
  zoom: 1.0,
  activeTool: "select",
  theme: getInitialTheme(),
  redactions: [],
  undoStack: [],
  redoStack: [],
  searchQuery: "",
  searchResults: [],
  scrollRequest: null,

  setDocument: (docId, filePath, pageCount) =>
    set({
      docId,
      filePath,
      pageCount,
      currentPage: 0,
      redactions: [],
      undoStack: [],
      redoStack: [],
      searchQuery: "",
      searchResults: [],
    }),

  closeDocument: () =>
    set({
      docId: null,
      filePath: null,
      pageCount: 0,
      currentPage: 0,
      redactions: [],
      undoStack: [],
      redoStack: [],
    }),

  setCurrentPage: (page) => set({ currentPage: page }),
  scrollToPage: (page) => set({ scrollRequest: { page, id: Date.now() } }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4.0, zoom)) }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  addRedaction: (region) => {
    const { redactions, undoStack } = get();
    const id = `redaction_${nextRedactionId++}`;
    set({
      redactions: [...redactions, { ...region, id }],
      undoStack: [...undoStack, redactions],
      redoStack: [],
    });
    return id;
  },

  removeRedaction: (id) => {
    const { redactions, undoStack } = get();
    set({
      redactions: redactions.filter((r) => r.id !== id),
      undoStack: [...undoStack, redactions],
      redoStack: [],
    });
  },

  clearRedactions: () => {
    const { redactions, undoStack } = get();
    if (redactions.length > 0) {
      set({
        redactions: [],
        undoStack: [...undoStack, redactions],
        redoStack: [],
      });
    }
  },

  undo: () => {
    const { redactions, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      redactions: previous,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, redactions],
    });
  },

  redo: () => {
    const { redactions, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      redactions: next,
      undoStack: [...undoStack, redactions],
      redoStack: redoStack.slice(0, -1),
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    try { localStorage.setItem("pdf-redactor-theme", next); } catch { /* noop */ }
    set({ theme: next });
  },
}));
