import { create } from 'zustand';

const STORAGE_KEY = 'aa_settings';

// ── Accent & Font presets ─────────────────────────────────────────────────────
export const ACCENT_PRESETS = {
  navy:     { label: 'Navy',      hex: '#1e3a6e', rgb: '30 58 110',   hover: '24 46 88',   dark: '18 35 66'   },
  jade:     { label: 'Jade',      hex: '#145a45', rgb: '20 90 69',    hover: '16 72 55',   dark: '12 54 41'   },
  wine:     { label: 'Wine',      hex: '#7c1d38', rgb: '124 29 56',   hover: '99 23 45',   dark: '74 17 34'   },
  cobalt:   { label: 'Cobalt',    hex: '#1a3a8f', rgb: '26 58 143',   hover: '21 46 114',  dark: '16 35 86'   },
  plum:     { label: 'Plum',      hex: '#5b1f78', rgb: '91 31 120',   hover: '73 25 96',   dark: '55 19 72'   },
  amber:    { label: 'Amber',     hex: '#7c3d00', rgb: '124 61 0',    hover: '99 49 0',    dark: '74 37 0'    },
  petrol:   { label: 'Petrol',    hex: '#0e4d4d', rgb: '14 77 77',    hover: '11 62 62',   dark: '8 46 46'    },
  rust:     { label: 'Rust',      hex: '#8b2500', rgb: '139 37 0',    hover: '111 30 0',   dark: '83 22 0'    },
  forest:   { label: 'Forest',    hex: '#1a4a1a', rgb: '26 74 26',    hover: '21 59 21',   dark: '16 44 16'   },
  storm:    { label: 'Storm',     hex: '#243b55', rgb: '36 59 85',    hover: '29 47 68',   dark: '22 35 51'   },
};

export const FONT_PRESETS = [
  { label: 'DM Sans',           value: 'DM Sans',           google: false },
  { label: 'Inter',             value: 'Inter',             google: true  },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans',  google: true  },
  { label: 'Nunito',            value: 'Nunito',            google: true  },
  { label: 'Poppins',          value: 'Poppins',            google: true  },
];

// ── Built-in scoring presets ──────────────────────────────────────────────────
export const BUILTIN_PRESETS = [
  {
    id: 'standard', name: 'Standard', isBuiltIn: true,
    classStart: '09:00', classEnd: '10:00',
    lateThreshold: 10, absentThreshold: 30,
    maxScore: 100, latePenalty: 1.0, absentPenalty: 2.0,
  },
  {
    id: 'strict', name: 'Strict', isBuiltIn: true,
    classStart: '09:00', classEnd: '10:00',
    lateThreshold: 5, absentThreshold: 20,
    maxScore: 100, latePenalty: 2.0, absentPenalty: 5.0,
  },
  {
    id: 'lenient', name: 'Lenient', isBuiltIn: true,
    classStart: '09:00', classEnd: '10:00',
    lateThreshold: 15, absentThreshold: 45,
    maxScore: 100, latePenalty: 0.5, absentPenalty: 1.0,
  },
];

// ── Factory defaults ──────────────────────────────────────────────────────
export const FACTORY_DEFAULTS = {
  // Appearance
  accentPreset: 'navy',
  bodyFont: 'DM Sans',
  theme: 'dark', // 'dark' | 'light'
  // Default analysis config (used by Reset button)
  defaultConfig: {
    classStart: '09:00', classEnd: '10:00',
    lateThreshold: 10, absentThreshold: 30,
    maxScore: 100, latePenalty: 1.0, absentPenalty: 2.0,
  },
  // Scoring presets (user-created only; built-ins are always in code)
  customPresets: [],
  // Grade thresholds
  gradeThresholds: [
    { grade: 'A', min: 90, color: '#16a34a' },
    { grade: 'B', min: 80, color: '#2563eb' },
    { grade: 'C', min: 70, color: '#d97706' },
    { grade: 'D', min: 60, color: '#ea580c' },
    { grade: 'F', min: 0,  color: '#dc2626' },
  ],
  // Table columns visibility
  visibleColumns: {
    role: true, name: true, id: true,
    firstDate: false, lastDate: false,
    totalClasses: true, onTime: true, late: true, absent: true,
    grade: true, score: true,
  },
  // Score color thresholds (percentage)
  highScoreThreshold: 90,
  midScoreThreshold: 70,
  // At-risk threshold (percentage)
  atRiskThreshold: 70,
  // Analysis behaviour
  autoReanalyze: true,
  // Export behaviour
  exportFormat: 'csv',
  anonymizeExports: false,
  // Data
  persistResults: true,
  // Display
  rowsPerPage: 25,
  defaultSort: 'score',
};

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return FACTORY_DEFAULTS;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return FACTORY_DEFAULTS;
    
    // If the stored accent key no longer exists (e.g. old preset was removed), reset to default
    const accentPreset = ACCENT_PRESETS[parsed.accentPreset]
      ? parsed.accentPreset
      : FACTORY_DEFAULTS.accentPreset;
    return {
      ...FACTORY_DEFAULTS,
      ...parsed,
      accentPreset,
      defaultConfig: { ...FACTORY_DEFAULTS.defaultConfig, ...(parsed.defaultConfig || {}) },
      gradeThresholds: parsed.gradeThresholds || FACTORY_DEFAULTS.gradeThresholds,
      visibleColumns:  { ...FACTORY_DEFAULTS.visibleColumns, ...(parsed.visibleColumns || {}) },
      customPresets:   parsed.customPresets || [],
    };
  } catch {
    return FACTORY_DEFAULTS;
  }
}

function persist(state) {
  try {
    const keys = [
      'accentPreset', 'bodyFont', 'theme', 'defaultConfig', 'customPresets',
      'gradeThresholds', 'visibleColumns',
      'highScoreThreshold', 'midScoreThreshold', 'atRiskThreshold',
      'autoReanalyze', 'exportFormat', 'anonymizeExports', 'persistResults',
      'rowsPerPage', 'defaultSort',
    ];
    const data = {};
    keys.forEach(k => { data[k] = state[k]; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

const initial = loadFromStorage();

// ── Store ─────────────────────────────────────────────────────────────────────
export const useSettingsStore = create((set, get) => ({
  ...initial,

  // Appearance
  setAccentPreset: (accentPreset) => set((s) => { const n = { ...s, accentPreset }; persist(n); return n; }),
  setBodyFont: (bodyFont)         => set((s) => { const n = { ...s, bodyFont };     persist(n); return n; }),
  setTheme: (theme)               => set((s) => { const n = { ...s, theme };        persist(n); return n; }),

  // Default config
  updateDefaultConfig: (partial) =>
    set((s) => {
      const defaultConfig = { ...s.defaultConfig, ...partial };
      const n = { ...s, defaultConfig };
      persist(n);
      return n;
    }),

  // Scoring presets
  savePreset: (name, config) =>
    set((s) => {
      const preset = { id: `custom_${Date.now()}`, name, isBuiltIn: false, ...config };
      const customPresets = [...s.customPresets, preset];
      const n = { ...s, customPresets };
      persist(n);
      return n;
    }),

  deletePreset: (id) =>
    set((s) => {
      const customPresets = s.customPresets.filter(p => p.id !== id);
      const n = { ...s, customPresets };
      persist(n);
      return n;
    }),

  renamePreset: (id, name) =>
    set((s) => {
      const customPresets = s.customPresets.map(p => p.id === id ? { ...p, name } : p);
      const n = { ...s, customPresets };
      persist(n);
      return n;
    }),

  // Grade thresholds
  updateGradeThreshold: (grade, min) =>
    set((s) => {
      const gradeThresholds = s.gradeThresholds.map(t => t.grade === grade ? { ...t, min: +min } : t);
      const n = { ...s, gradeThresholds };
      persist(n);
      return n;
    }),

  updateGradeColor: (grade, color) =>
    set((s) => {
      const gradeThresholds = s.gradeThresholds.map(t => t.grade === grade ? { ...t, color } : t);
      const n = { ...s, gradeThresholds };
      persist(n);
      return n;
    }),

  resetGradeThresholds: () =>
    set((s) => {
      const gradeThresholds = FACTORY_DEFAULTS.gradeThresholds;
      const n = { ...s, gradeThresholds };
      persist(n);
      return n;
    }),

  // Column visibility
  toggleColumn: (colId) =>
    set((s) => {
      const visibleColumns = { ...s.visibleColumns, [colId]: !s.visibleColumns[colId] };
      const n = { ...s, visibleColumns };
      persist(n);
      return n;
    }),

  resetColumns: () =>
    set((s) => {
      const visibleColumns = { ...FACTORY_DEFAULTS.visibleColumns };
      const n = { ...s, visibleColumns };
      persist(n);
      return n;
    }),

  // Score color thresholds
  setHighScoreThreshold: (v) => set((s) => { const n = { ...s, highScoreThreshold: +v }; persist(n); return n; }),
  setMidScoreThreshold:  (v) => set((s) => { const n = { ...s, midScoreThreshold:  +v }; persist(n); return n; }),

  // At-risk
  setAtRiskThreshold: (v) => set((s) => { const n = { ...s, atRiskThreshold: +v }; persist(n); return n; }),

  // Analysis behaviour
  setAutoReanalyze:    (v) => set((s) => { const n = { ...s, autoReanalyze:    v }; persist(n); return n; }),

  // Export
  setExportFormat:     (v) => set((s) => { const n = { ...s, exportFormat:     v }; persist(n); return n; }),
  setAnonymizeExports: (v) => set((s) => { const n = { ...s, anonymizeExports: v }; persist(n); return n; }),

  // Data
  setPersistResults: (v) => set((s) => { const n = { ...s, persistResults: v }; persist(n); return n; }),

  // Display
  setRowsPerPage:  (v) => set((s) => { const n = { ...s, rowsPerPage:  +v }; persist(n); return n; }),
  setDefaultSort:  (v) => set((s) => { const n = { ...s, defaultSort:   v }; persist(n); return n; }),

  // Factory reset
  resetAll: () => set(() => { persist(FACTORY_DEFAULTS); return { ...FACTORY_DEFAULTS }; }),

  // Export settings as JSON string
  exportSettingsJSON: () => {
    const s = get();
    const keys = [
      'accentPreset', 'bodyFont', 'theme', 'defaultConfig', 'customPresets',
      'gradeThresholds', 'visibleColumns',
      'highScoreThreshold', 'midScoreThreshold', 'atRiskThreshold',
      'autoReanalyze', 'exportFormat', 'anonymizeExports', 'persistResults',
      'rowsPerPage', 'defaultSort',
    ];
    const data = {};
    keys.forEach(k => { data[k] = s[k]; });
    return JSON.stringify(data, null, 2);
  },

  importSettingsJSON: (jsonStr) => {
    const parsed = JSON.parse(jsonStr);
    const merged = {
      ...FACTORY_DEFAULTS, ...parsed,
      defaultConfig:   { ...FACTORY_DEFAULTS.defaultConfig,   ...(parsed.defaultConfig   || {}) },
      gradeThresholds: parsed.gradeThresholds || FACTORY_DEFAULTS.gradeThresholds,
      visibleColumns:  { ...FACTORY_DEFAULTS.visibleColumns,  ...(parsed.visibleColumns  || {}) },
      customPresets:   parsed.customPresets || [],
    };
    persist(merged);
    set(() => merged);
  },
}));
