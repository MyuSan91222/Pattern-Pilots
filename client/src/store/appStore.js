import { create } from 'zustand';

const HARDCODED_DEFAULT = {
  classStart: '09:00',
  classEnd: '10:00',
  lateThreshold: 10,
  absentThreshold: 30,
  maxScore: 100,
  latePenalty: 1.0,
  absentPenalty: 2.0,
  timesLocked: false,
};

const RESULTS_KEY = 'aa_results';

function getSetting(key, fallback) {
  try {
    const s = localStorage.getItem('aa_settings');
    if (s) return JSON.parse(s)[key] ?? fallback;
  } catch {}
  return fallback;
}

function getSavedDefaults() {
  try {
    const saved = localStorage.getItem('aa_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.defaultConfig) {
        return { ...HARDCODED_DEFAULT, ...parsed.defaultConfig, timesLocked: false };
      }
    }
  } catch {}
  return { ...HARDCODED_DEFAULT };
}

function loadPersistedResults() {
  try {
    if (!getSetting('persistResults', true)) return null;
    const saved = localStorage.getItem(RESULTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveResults(students, numSessions, fileNames) {
  try {
    if (!getSetting('persistResults', true)) return;
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ students, numSessions, fileNames, savedAt: Date.now() }));
  } catch {}
}

function clearPersistedResults() {
  try { localStorage.removeItem(RESULTS_KEY); } catch {}
}

const persisted = loadPersistedResults();

export const useAppStore = create((set) => ({
  config: getSavedDefaults(),
  committedConfig: persisted ? { ...getSavedDefaults() } : null,
  originalConfig: null,
  students: persisted?.students || [],
  numSessions: persisted?.numSessions || 0,
  fileNames: persisted?.fileNames || [],
  resultsRestoredAt: persisted?.savedAt || null,
  parsedFiles: [],
  selectedFileNames: [],

  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
  resetConfig: () => set({ config: getSavedDefaults() }),
  commitConfig: () => set((s) => ({ committedConfig: { ...s.config } })),
  setOriginalConfig: () => set((s) => ({ originalConfig: { ...s.config } })),
  clearCommittedConfig: () => set({ committedConfig: null, originalConfig: null }),

  setResults: (students, numSessions, fileNames) => {
    saveResults(students, numSessions, fileNames);
    set({ students, numSessions, fileNames, resultsRestoredAt: null });
  },

  clearResults: () => {
    clearPersistedResults();
    set({ students: [], numSessions: 0, fileNames: [], resultsRestoredAt: null });
  },

  clearPersistedOnly: () => {
    clearPersistedResults();
    set({ resultsRestoredAt: null });
  },

  setParsedFiles: (files) => set({ parsedFiles: files }),
  
  setSelectedFiles: (filenames) => set({ selectedFileNames: filenames }),
  
  toggleFileSelection: (filename) => set((s) => {
    const selected = new Set(s.selectedFileNames);
    if (selected.has(filename)) {
      selected.delete(filename);
    } else {
      selected.add(filename);
    }
    return { selectedFileNames: Array.from(selected) };
  }),
  
  selectAllFiles: () => set((s) => ({
    selectedFileNames: s.parsedFiles.map(f => f.filename),
  })),
  
  deselectAllFiles: () => set({ selectedFileNames: [] }),
  
  addParsedFiles: (newFiles) => set((s) => {
    const existing = new Set(s.parsedFiles.map(f => f.filename));
    const toAdd = newFiles.filter(f => !existing.has(f.filename));
    return { parsedFiles: [...s.parsedFiles, ...toAdd] };
  }),

  removeParsedFile: (filename) => set((s) => ({
    parsedFiles: s.parsedFiles.filter(f => f.filename !== filename),
  })),

  clearParsedFiles: () => set({ parsedFiles: [] }),
}));
