import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Settings, Download, User, RotateCcw,
  Save, Mail, CheckCircle, AlertTriangle, ChevronRight, Palette, Crown, Clock, Calendar,
  Bookmark, Zap, Database, Trash2, Plus, Eye, EyeOff, RefreshCw,
  HardDrive, FileJson, AlertCircle, Table2, Tag, Sliders, Download as DownloadIcon,
  Edit2, Check, X, Trash, LogIn, Package, Award, MapPin as MapPinIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore, FACTORY_DEFAULTS, ACCENT_PRESETS, FONT_PRESETS, BUILTIN_PRESETS } from '../store/settingsStore';
import { useLostFoundStore, DEFAULT_LF_SETTINGS, CATEGORIES } from '../store/lostFoundStore';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString();
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="card overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in fade-in zoom-in" style={{animationDuration: '500ms'}}>
      <div className="p-5 border-b border-current border-opacity-10 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5 animate-in spin" style={{animationDuration: '700ms'}}>
          <Icon size={15} className="text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-current" style={{ fontFamily: 'Syne' }}>{title}</h2>
          <p className="text-xs text-current text-opacity-60 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Row inside a section ──────────────────────────────────────────────────────
function SettingField({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-current border-opacity-10 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-current">{label}</p>
        {hint && <p className="text-xs text-current text-opacity-50 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Appearance ────────────────────────────────────────────────────────────────
function AppearanceSection() {
  const { accentPreset, setAccentPreset, bodyFont, setBodyFont } = useSettingsStore();

  const handleAccent = (key) => {
    setAccentPreset(key);
    const preset = ACCENT_PRESETS[key];
    const root = document.documentElement;
    root.style.setProperty('--accent',       preset.rgb);
    root.style.setProperty('--accent-hover', preset.hover);
    root.style.setProperty('--accent-dark',  preset.dark);
    toast.success(`Accent: ${preset.label}`);
  };

  const handleFont = (font) => {
    setBodyFont(font);
    const preset = FONT_PRESETS.find(f => f.value === font);
    if (preset?.google) {
      const id = 'dynamic-google-font';
      let link = document.getElementById(id);
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    }
    document.documentElement.style.setProperty('--font-body', `'${font}'`);
    toast.success(`Font: ${font}`);
  };

  return (
    <Section
      icon={Palette}
      title="Appearance"
      description="Personalize the app's accent color and body font"
    >
      {/* Accent color */}
      <p className="text-xs text-current text-opacity-60 uppercase tracking-wider mb-3" style={{ fontFamily: 'Syne' }}>
        Accent Color
      </p>
      <div className="flex gap-2.5 flex-wrap mb-6">
        {Object.entries(ACCENT_PRESETS).map(([key, preset]) => {
          const active = accentPreset === key;
          return (
            <button
              key={key}
              onClick={() => handleAccent(key)}
              title={preset.label}
              className={`group relative flex flex-col items-center gap-1.5 transition-all duration-300 hover:scale-125 animate-in fade-in`}
            >
              <span
                className={`w-8 h-8 rounded-full block transition-all ring-offset-2 ${
                  active ? 'ring-2 scale-110 animate-pulse' : 'hover:scale-105 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: preset.hex,
                  ringColor: preset.hex,
                  ringOffsetColor: 'rgb(var(--bg-primary))',
                  boxShadow: active ? `0 0 0 2px rgb(var(--bg-primary)), 0 0 0 4px ${preset.hex}` : undefined,
                }}
              />
              <span className={`text-[10px] transition-colors ${active ? 'text-current font-semibold' : 'text-current text-opacity-60 group-hover:text-opacity-80'}`}>
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected accent color display */}
      <div className="mb-6 p-4 rounded-lg bg-white border-2 border-black shadow-lg">
        <p className="text-xs font-bold text-black uppercase tracking-wider mb-3" style={{ fontFamily: 'Syne', letterSpacing: '0.08em' }}>
          Selected Accent Color
        </p>
        <div className="flex items-center gap-4">
          <span
            className="w-12 h-12 rounded-full block flex-shrink-0 shadow-lg"
            style={{
              backgroundColor: ACCENT_PRESETS[accentPreset]?.hex,
              boxShadow: `0 6px 16px ${ACCENT_PRESETS[accentPreset]?.hex}70, inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}
          />
          <div>
            <p className="text-lg font-bold text-black">{ACCENT_PRESETS[accentPreset]?.label}</p>
            <p className="text-xs font-mono text-black mt-0.5">{ACCENT_PRESETS[accentPreset]?.hex}</p>
          </div>
        </div>
      </div>

      {/* Font */}
      <p className="text-xs text-current text-opacity-60 uppercase tracking-wider mb-3" style={{ fontFamily: 'Syne' }}>
        Body Font
      </p>
      <div className="grid grid-cols-1 gap-2">
        {FONT_PRESETS.map((f) => {
          const active = bodyFont === f.value;
          return (
            <button
              key={f.value}
              onClick={() => handleFont(f.value)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-300 text-left ${
                active
                  ? 'border-accent bg-accent/10 scale-105 shadow-lg shadow-accent/40'
                  : 'border-current border-opacity-20 hover:border-accent hover:bg-accent/5 hover:scale-105 hover:shadow-lg hover:shadow-accent/30'
              }`}
            >
              <span
                className={`text-sm ${active ? 'text-current font-semibold' : 'text-current text-opacity-70'}`}
                style={{ fontFamily: `'${f.value}', sans-serif` }}
              >
                {f.label}
              </span>
              <span className={`text-xs ${active ? 'text-accent' : 'text-current text-opacity-50'}`}>
                {active ? '✓ Active' : f.google ? 'Google Fonts' : 'Built-in'}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ── Default Config ────────────────────────────────────────────────────────────
function DefaultConfigSection() {
  const { defaultConfig, updateDefaultConfig } = useSettingsStore();
  const [local, setLocal] = useState({ ...defaultConfig });
  const [dirty, setDirty] = useState(false);

  const update = (key, val) => {
    setLocal((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    updateDefaultConfig(local);
    setDirty(false);
    toast.success('Default configuration saved');
  };

  const handleReset = () => {
    const d = FACTORY_DEFAULTS.defaultConfig;
    setLocal({ ...d });
    updateDefaultConfig(d);
    setDirty(false);
    toast.success('Restored factory defaults');
  };

  return (
    <Section
      icon={Sliders}
      title="Default Analysis Configuration"
      description="These values load when you open the Dashboard or press Reset"
    >
      <SettingField label="Class Start" hint="Default class start time">
        <div className="relative group">
          <input type="time" className="input text-sm w-32 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 hover:border-accent/50 transition-all duration-300" value={local.classStart}
            onChange={(e) => update('classStart', e.target.value)} />
          <div className="absolute -bottom-6 left-0 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Class begins</div>
        </div>
      </SettingField>
      <SettingField label="Class End" hint="Default class end time">
        <div className="relative group">
          <input type="time" className="input text-sm w-32 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 hover:border-accent/50 transition-all duration-300" value={local.classEnd}
            onChange={(e) => update('classEnd', e.target.value)} />
          <div className="absolute -bottom-6 left-0 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Class ends</div>
        </div>
      </SettingField>
      <SettingField label="Late After (min)" hint="Minutes after class start to be considered late">
        <div className="relative group">
          <input type="number" className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 hover:border-accent/50 transition-all duration-300" min={0} max={60} value={local.lateThreshold}
            onChange={(e) => update('lateThreshold', +e.target.value)} />
          <div className="absolute -bottom-6 left-0 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Late threshold</div>
        </div>
      </SettingField>
      <SettingField label="Absent After (min)" hint="Minutes after class start to be marked absent">
        <div className="relative group">
          <input type="number" className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 hover:border-accent/50 transition-all duration-300" min={0} max={240} value={local.absentThreshold}
            onChange={(e) => update('absentThreshold', +e.target.value)} />
          <div className="absolute -bottom-6 left-0 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Absent threshold</div>
        </div>
      </SettingField>
      <SettingField label="Max Score" hint="Full marks available per student">
        <input type="number" className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300" min={0} value={local.maxScore}
          onChange={(e) => update('maxScore', +e.target.value)} />
      </SettingField>
      <SettingField label="Late Penalty" hint="Points deducted per late attendance">
        <input type="number" className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300" min={0} step={0.5} value={local.latePenalty}
          onChange={(e) => update('latePenalty', +e.target.value)} />
      </SettingField>
      <SettingField label="Absent Penalty" hint="Points deducted per absence">
        <input type="number" className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300" min={0} step={0.5} value={local.absentPenalty}
          onChange={(e) => update('absentPenalty', +e.target.value)} />
      </SettingField>

      <div className="flex items-center gap-3 pt-4">
        <button onClick={handleSave} disabled={!dirty}
          className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/40">
          <Save size={13} />Save Defaults
        </button>
        <button onClick={handleReset}
          className="text-xs text-ink-500 border border-ink-700 rounded px-3 py-1.5 flex items-center gap-1.5 hover:border-accent hover:text-accent hover:scale-105 hover:shadow-lg hover:shadow-accent/30 transition-all duration-300">
          <RotateCcw size={12} />Factory Reset
        </button>
      </div>
    </Section>
  );
}

// ── Account ───────────────────────────────────────────────────────────────────
function AccountSection() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSending(true);
    try {
      await authApi.forgot(user.email);
      setSent(true);
      toast.success('Password reset email sent — check your inbox');
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Section icon={User} title="Account" description="Your account information and security settings">

      {/* Profile card — mirrors the old Navbar user info */}
      <div className={`flex items-center gap-4 p-4 rounded-xl mb-5 border ${
        isAdmin ? 'bg-amber-500/5 border-amber-500/20' : 'bg-ink-900/60 border-ink-700'
      }`}>
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAdmin ? 'bg-amber-500/20 ring-2 ring-amber-500/40' : 'bg-ink-800 ring-1 ring-ink-700'
        }`}>
          {isAdmin
            ? <Crown size={20} className="text-amber-400" />
            : <User size={20} className="text-ink-400" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink-100 truncate">{user?.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Crown size={9} /> Admin
              </span>
            )}
            {user?.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle size={9} /> Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {user?.lastLogin ? (
              <span className="flex items-center gap-1 text-[11px] text-ink-500">
                <Clock size={10} /> Last login: {formatRelativeTime(user.lastLogin)}
              </span>
            ) : (
              <span className="text-[11px] text-ink-600">First login</span>
            )}
            {user?.createdAt && (
              <span className="flex items-center gap-1 text-[11px] text-ink-600">
                <Calendar size={10} /> Joined: {new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fields */}
      <SettingField label="Email">
        <span className="text-sm font-mono text-ink-300">{user?.email || '—'}</span>
      </SettingField>
      <SettingField label="Role">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          isAdmin
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'bg-ink-800 text-ink-400 border border-ink-700'
        }`}>
          {isAdmin ? 'Admin' : 'User'}
        </span>
      </SettingField>
      <SettingField label="Email Verified">
        <span className={`flex items-center gap-1.5 text-xs ${user?.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
          {user?.verified
            ? <><CheckCircle size={13} /> Verified</>
            : <><AlertTriangle size={13} /> Not verified</>}
        </span>
      </SettingField>
      <SettingField label="Account Created">
        <span className="text-xs text-ink-400">{formatDate(user?.createdAt)}</span>
      </SettingField>
      <SettingField label="Last Login">
        <span className="text-xs text-ink-400">{formatDate(user?.lastLogin)}</span>
      </SettingField>

      {/* Security */}
      <div className="pt-4">
        <p className="text-xs text-ink-500 mb-3">Password & Security</p>
        <button onClick={handlePasswordReset} disabled={sending || sent}
          className="flex items-center gap-2 text-sm text-ink-300 border border-ink-700 rounded-lg px-4 py-2 hover:border-accent hover:text-accent hover:bg-accent/5 hover:scale-105 hover:shadow-lg hover:shadow-accent/30 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {sent ? <CheckCircle size={14} className="text-emerald-400" /> : <Mail size={14} />}
          {sent ? 'Reset email sent' : sending ? 'Sending…' : 'Send Password Reset Email'}
        </button>
        <p className="text-xs text-ink-600 mt-2">A reset link will be sent to your registered email</p>
      </div>
    </Section>
  );
}

// ── Scoring Presets ───────────────────────────────────────────────────────────
function PresetsSection() {
  const { customPresets, savePreset, deletePreset, renamePreset } = useSettingsStore();
  const { config, setConfig } = useAppStore();
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  const allPresets = [...BUILTIN_PRESETS, ...customPresets];

  const handleLoad = (preset) => {
    const { id, name, isBuiltIn, ...cfg } = preset;
    setConfig({ ...cfg, timesLocked: false });
    toast.success(`Loaded "${name}" — go to Dashboard and click Analyze`);
  };

  const handleSave = () => {
    if (!newName.trim()) { toast.error('Enter a preset name'); return; }
    setSaving(true);
    savePreset(newName.trim(), {
      classStart: config.classStart, classEnd: config.classEnd,
      lateThreshold: config.lateThreshold, absentThreshold: config.absentThreshold,
      maxScore: config.maxScore, latePenalty: config.latePenalty, absentPenalty: config.absentPenalty,
    });
    toast.success(`Preset "${newName.trim()}" saved`);
    setNewName('');
    setSaving(false);
  };

  const handleRename = (id) => {
    if (!renameVal.trim()) return;
    renamePreset(id, renameVal.trim());
    toast.success('Preset renamed');
    setRenamingId(null);
    setRenameVal('');
  };

  return (
    <Section icon={Bookmark} title="Scoring Presets"
      description="Save and load named scoring configurations for different class types">

      <div className="space-y-2 mb-5">
        {allPresets.map((preset, idx) => (
          <div key={preset.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 group hover:scale-101 animate-in fade-in slide-in-from-left ${
            idx % 2 === 0 ? 'bg-ink-900/30 border-ink-700/40' : 'bg-ink-800/20 border-ink-700/30'
          } hover:border-accent/60 hover:shadow-lg hover:shadow-accent/25`} style={{ animationDelay: `${idx * 50}ms` }}>
            {/* Left: Info */}
            <div className="flex-1 min-w-0">
              {renamingId === preset.id ? (
                <input autoFocus className="input text-sm py-1 w-full focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300"
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(preset.id); if (e.key === 'Escape') setRenamingId(null); }}
                />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-100">{preset.name}</p>
                    {preset.isBuiltIn && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/40 font-semibold">Built-in</span>}
                  </div>
                  <p className="text-xs text-ink-600 space-x-2">
                    <span className="inline-block"><strong className="text-ink-400">Time:</strong> {preset.classStart}–{preset.classEnd}</span>
                    <span>·</span>
                    <span className="inline-block"><strong className="text-ink-400">Late:</strong> <span className="text-amber-400 font-medium">+{preset.lateThreshold}m</span></span>
                    <span>·</span>
                    <span className="inline-block"><strong className="text-ink-400">Max:</strong> <span className="text-blue-400 font-medium">{preset.maxScore}pts</span></span>
                  </p>
                </div>
              )}
            </div>

            {/* Right: Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={() => handleLoad(preset)} title="Load preset"
                className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/60 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 active:scale-95 animate-in fade-in">
                <LogIn size={14} />
              </button>
              {!preset.isBuiltIn && renamingId !== preset.id && (
                <button onClick={() => { setRenamingId(preset.id); setRenameVal(preset.name); }} title="Rename preset"
                  className="p-1.5 rounded-lg border border-ink-600/50 text-ink-400 hover:text-ink-200 hover:border-ink-500 hover:bg-ink-800/40 hover:scale-110 hover:shadow-lg hover:shadow-ink-500/20 transition-all duration-300 active:scale-95 animate-in fade-in">
                  <Edit2 size={14} />
                </button>
              )}
              {renamingId === preset.id && (
                <button onClick={() => handleRename(preset.id)} title="Save name"
                  className="p-1.5 rounded-lg bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 hover:border-accent/60 hover:scale-110 hover:shadow-lg hover:shadow-accent/40 transition-all duration-300 active:scale-95 animate-in fade-in">
                  <Check size={14} />
                </button>
              )}
              {!preset.isBuiltIn && (
                <button onClick={() => { deletePreset(preset.id); toast.success('Preset deleted'); }} title="Delete preset"
                  className="p-1.5 rounded-lg text-red-400/70 border border-red-500/20 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 hover:scale-110 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 active:scale-95 animate-in fade-in">
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-800 pt-4">
        <p className="text-xs text-ink-500 mb-2">Save current Dashboard config as preset</p>
        <div className="flex gap-2">
          <input className="input text-sm flex-1 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300" placeholder="Preset name…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
          <button onClick={handleSave} disabled={saving || !newName.trim()}
            className="btn-primary flex items-center gap-1.5 px-3 disabled:opacity-40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/40">
            <Plus size={13} />Save
          </button>
        </div>
        <p className="text-xs text-ink-600 mt-1.5">Current: {config.maxScore} pts · Late −{config.latePenalty} · Absent −{config.absentPenalty}</p>
      </div>
    </Section>
  );
}

// ── Table Settings ────────────────────────────────────────────────────────────
const COLUMN_LABELS = {
  role: 'Role', name: 'Name', id: 'Student ID',
  firstDate: 'First Date', lastDate: 'Last Date',
  totalClasses: 'Total Classes', onTime: 'On-Time', late: 'Late',
  absent: 'Absent', grade: 'Grade', score: 'Score',
};

function TableSection() {
  const {
    visibleColumns, toggleColumn, resetColumns,
    gradeThresholds, updateGradeThreshold, updateGradeColor, resetGradeThresholds,
    highScoreThreshold, midScoreThreshold, setHighScoreThreshold, setMidScoreThreshold,
    atRiskThreshold, setAtRiskThreshold,
  } = useSettingsStore();

  return (
    <div className="space-y-5">
      {/* Column visibility */}
      <Section icon={Table2} title="Column Visibility"
        description="Toggle which columns appear in the student results table">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(COLUMN_LABELS).map(([id, label]) => {
            const visible = visibleColumns[id] !== false;
            return (
              <button key={id} onClick={() => toggleColumn(id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 overflow-hidden group ${
                  visible 
                    ? 'bg-accent text-ink-950 shadow-lg shadow-accent/50 hover:shadow-xl hover:shadow-accent/60 hover:scale-110 scale-100' 
                    : 'bg-ink-800/50 text-ink-400 border border-ink-700/50 hover:bg-ink-800 hover:border-accent/40 hover:text-accent hover:scale-105'
                }`}>
                <span className={`transition-transform duration-300 ${visible ? 'scale-110' : 'scale-100'}`}>
                  {visible ? <Eye size={14} className="flex-shrink-0" /> : <EyeOff size={14} className="flex-shrink-0" />}
                </span>
                <span className="truncate">{label}</span>
                {visible && <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-300" />}
              </button>
            );
          })}
        </div>
        <button onClick={() => { resetColumns(); toast.success('Columns reset'); }}
          className="text-xs text-ink-500 flex items-center gap-1.5 hover:text-accent hover:scale-105 transition-all duration-300">
          <RotateCcw size={11} />Reset to defaults
        </button>
      </Section>

      {/* Grade thresholds */}
      <Section icon={Tag} title="Grade Thresholds"
        description="Configure the minimum score percentage for each letter grade">
        <div className="space-y-2 mb-4">
          {gradeThresholds.map((t) => (
            <div key={t.grade} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: t.color }}>{t.grade}</span>
              <span className="text-sm text-ink-300 w-4">{t.grade}</span>
              <div className="flex items-center gap-1.5 flex-1">
                <input type="number" min={0} max={100}
                  className="input text-sm w-20 py-1.5 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300"
                  value={t.min}
                  onChange={e => updateGradeThreshold(t.grade, e.target.value)} />
                <span className="text-xs text-ink-500">% and above</span>
              </div>
              <input type="color" value={t.color}
                onChange={e => updateGradeColor(t.grade, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-ink-700 bg-ink-900 p-0.5 hover:scale-110 hover:shadow-lg hover:shadow-accent/30 transition-all duration-300" />
            </div>
          ))}
        </div>
        <button onClick={() => { resetGradeThresholds(); toast.success('Grade thresholds reset'); }}
          className="text-xs text-ink-500 flex items-center gap-1.5 hover:text-accent hover:scale-105 transition-all duration-300">
          <RotateCcw size={11} />Reset to defaults
        </button>
      </Section>

      {/* Score color thresholds */}
      <Section icon={Sliders} title="Score Color Thresholds"
        description="Percentage cutoffs that determine score badge color in the table">
        <SettingField label="High Score (blue)" hint={`≥ ${highScoreThreshold}% shown in blue`}>
          <div className="flex items-center gap-2">
            <input type="range" min={50} max={100} step={5}
              value={highScoreThreshold}
              onChange={e => { setHighScoreThreshold(+e.target.value); }}
              className="w-28 accent-[#1565c0] hover:scale-105 transition-all duration-300 cursor-pointer" />
            <span className="text-sm font-mono text-ink-300 w-10 text-right">{highScoreThreshold}%</span>
          </div>
        </SettingField>
        <SettingField label="Mid Score (amber)" hint={`≥ ${midScoreThreshold}% shown in amber`}>
          <div className="flex items-center gap-2">
            <input type="range" min={30} max={90} step={5}
              value={midScoreThreshold}
              onChange={e => { setMidScoreThreshold(+e.target.value); }}
              className="w-28 accent-[#7c4900] hover:scale-105 transition-all duration-300 cursor-pointer" />
            <span className="text-sm font-mono text-ink-300 w-10 text-right">{midScoreThreshold}%</span>
          </div>
        </SettingField>
        <SettingField label="At-Risk Threshold" hint="Students below this % flagged as at-risk">
          <div className="flex items-center gap-2">
            <input type="range" min={30} max={95} step={5}
              value={atRiskThreshold}
              onChange={e => { setAtRiskThreshold(+e.target.value); }}
              className="w-28 hover:scale-105 transition-all duration-300 cursor-pointer" />
            <span className="text-sm font-mono text-ink-300 w-10 text-right">{atRiskThreshold}%</span>
          </div>
        </SettingField>
      </Section>
    </div>
  );
}

// ── Advanced ──────────────────────────────────────────────────────────────────
function AdvancedSection() {
  const {
    autoReanalyze, setAutoReanalyze,
    anonymizeExports, setAnonymizeExports,
    persistResults, setPersistResults,
    exportFormat, setExportFormat,
  } = useSettingsStore();

  const Toggle = ({ value, onChange, label, hint }) => (
    <SettingField label={label} hint={hint}>
      <button onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-ink-900 ${
          value ? 'bg-accent shadow-lg shadow-accent/30' : 'bg-ink-700 hover:bg-ink-600'
        }`}
        title={value ? 'Enabled' : 'Disabled'}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-200 ${
          value ? 'translate-x-7' : 'translate-x-1'
        }`} />
      </button>
    </SettingField>
  );

  return (
    <Section icon={Zap} title="Advanced Behaviour"
      description="Fine-tune analysis and export behaviour">
      <Toggle
        value={autoReanalyze}
        onChange={(v) => { setAutoReanalyze(v); toast.success(v ? 'Auto-reanalyze ON' : 'Auto-reanalyze OFF'); }}
        label="Auto-Reanalyze"
        hint="Automatically re-run analysis when scoring config changes (requires files to be loaded)"
      />
      <Toggle
        value={anonymizeExports}
        onChange={(v) => { setAnonymizeExports(v); toast.success(v ? 'Exports will be anonymized' : 'Exports will show real names'); }}
        label="Anonymize Exports"
        hint="Replace student names with Student 001, 002… in CSV, TXT, and PDF exports"
      />
      <Toggle
        value={persistResults}
        onChange={(v) => { setPersistResults(v); toast.success(v ? 'Results will be saved across sessions' : 'Results cleared on page close'); }}
        label="Persist Results"
        hint="Save last analysis results to browser storage so they reappear after page refresh"
      />
      <SettingField label="Default Export Format" hint="Format pre-selected when you click export on the Dashboard">
        <select className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300 cursor-pointer" value={exportFormat}
          onChange={(e) => { setExportFormat(e.target.value); toast.success(`Export format: ${e.target.value.toUpperCase()}`); }}>
          <option value="csv">CSV</option>
          <option value="txt">TXT</option>
          <option value="pdf">PDF</option>
        </select>
      </SettingField>
    </Section>
  );
}

// ── Card Design Style definitions ─────────────────────────────────────────────
const CARD_DESIGN_STYLES = [
  {
    id:      'default',
    label:   'Default',
    tagline: 'Classic dark card',
    accent:  '#374151',
    preview: {
      container: { background: '#0d1117', border: '1px solid #374151', borderRadius: '10px' },
      imgBar:    { background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' },
      textColor: 'rgba(156, 163, 175, 0.9)',
    },
  },
  {
    id:      'glassmorphism',
    label:   'Glassmorphism',
    tagline: 'Frosted glass · Sky blue',
    accent:  '#60a5fa',
    preview: {
      container: {
        background: 'rgba(96, 165, 250, 0.10)',
        border: '1px solid rgba(96, 165, 250, 0.30)',
        borderRadius: '14px',
        backdropFilter: 'blur(12px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
      },
      imgBar:    { background: 'linear-gradient(135deg, rgba(96,165,250,0.30) 0%, rgba(59,130,246,0.15) 100%)' },
      textColor: 'rgba(147, 197, 253, 0.9)',
    },
  },
  {
    id:      'skeuomorphism',
    label:   'Skeuomorphism',
    tagline: 'Warm leather · Rich depth',
    accent:  '#b45309',
    preview: {
      container: {
        background: 'linear-gradient(160deg, #1f1a0f 0%, #261e0e 60%, #1a1408 100%)',
        border: '1px solid #5a4520',
        borderRadius: '6px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,200,80,0.14)',
      },
      imgBar:    { background: 'linear-gradient(135deg, #3d2b0e 0%, #2a1e08 100%)' },
      textColor: 'rgba(205, 160, 80, 0.85)',
    },
  },
  {
    id:      'claymorphism',
    label:   'Claymorphism',
    tagline: 'Soft clay · Lavender-purple',
    accent:  '#a78bfa',
    preview: {
      container: {
        background: '#1e1648',
        border: '2px solid rgba(147,112,219,0.40)',
        borderRadius: '18px',
        boxShadow: '6px 6px 0px rgba(72,44,138,0.65)',
      },
      imgBar:    { background: 'linear-gradient(135deg, #2d1f6e 0%, #1e1448 100%)' },
      textColor: 'rgba(196, 181, 253, 0.9)',
    },
  },
  {
    id:      'liquid-glass',
    label:   'Liquid Glass',
    tagline: 'Iridescent · Purple-cyan',
    accent:  '#06b6d4',
    preview: {
      container: {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(6,182,212,0.14) 50%, rgba(16,185,129,0.18) 100%)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: '14px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 20px rgba(124,58,237,0.22)',
      },
      imgBar:    { background: 'linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(6,182,212,0.25) 100%)' },
      textColor: 'rgba(167, 243, 208, 0.9)',
    },
  },
  {
    id:      'minimalism',
    label:   'Minimalism',
    tagline: 'Clean flat · No noise',
    accent:  '#6b7280',
    preview: {
      container: {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '4px',
        boxShadow: 'none',
      },
      imgBar:    { background: 'rgba(255,255,255,0.05)' },
      textColor: 'rgba(209, 213, 219, 0.6)',
    },
  },
];

// ── Lost & Found Settings ─────────────────────────────────────────────────────
function LostFoundSection() {
  const { lfSettings, setLfSettings } = useLostFoundStore();

  const Toggle = ({ value, onChange, label, hint }) => (
    <SettingField label={label} hint={hint}>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-ink-900 ${
          value ? 'bg-accent shadow-lg shadow-accent/30' : 'bg-ink-700 hover:bg-ink-600'
        }`}
        title={value ? 'Enabled' : 'Disabled'}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-200 ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </SettingField>
  );

  const activeCardStyle = lfSettings.cardStyle ?? 'default';

  return (
    <div className="space-y-5">

      {/* ── Card Design Style ── */}
      <Section
        icon={Palette}
        title="Card Design Style"
        description="Choose the visual style applied to every Lost & Found item card"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CARD_DESIGN_STYLES.map((style) => {
            const active = activeCardStyle === style.id;
            const p = style.preview;
            return (
              <button
                key={style.id}
                onClick={() => { setLfSettings({ cardStyle: style.id }); toast.success(`Card style: ${style.label}`); }}
                className={`relative flex flex-col gap-2.5 p-3 rounded-xl border transition-all duration-300 text-left group ${
                  active
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20 scale-105'
                    : 'border-ink-700 hover:border-ink-500 hover:scale-105 hover:shadow-lg hover:shadow-black/30'
                }`}
              >
                {/* Mini card preview */}
                <div className="w-full h-20 rounded-lg overflow-hidden flex-shrink-0 relative" style={p.container}>
                  {/* Fake image bar */}
                  <div className="w-full h-11" style={p.imgBar} />
                  {/* Fake text lines */}
                  <div className="px-2 pt-1.5 space-y-1">
                    <div className="h-1.5 rounded-full w-3/4" style={{ background: p.textColor }} />
                    <div className="h-1 rounded-full w-1/2" style={{ background: p.textColor, opacity: 0.5 }} />
                  </div>
                  {/* Accent dot */}
                  <div
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ background: style.accent, boxShadow: `0 0 6px ${style.accent}` }}
                  />
                </div>
                {/* Labels */}
                <div>
                  <p className="text-[11px] font-bold text-ink-100 uppercase tracking-wider leading-tight">{style.label}</p>
                  <p className="text-[9px] text-ink-500 mt-0.5 leading-tight">{style.tagline}</p>
                </div>
                {/* Active badge */}
                {active && (
                  <span className="absolute top-2 right-2 text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
                    ON
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-600 mt-3">Style applies instantly to the Browse grid on the Lost & Found page.</p>
      </Section>

      {/* ── Feature 1: Auto-Expire Listings ── */}
      <Section
        icon={Clock}
        title="Auto-Expire Listings"
        description="Automatically badge listings as 'Expired' after a configurable number of days"
      >
        <Toggle
          value={lfSettings.autoExpireEnabled}
          onChange={(v) => { setLfSettings({ autoExpireEnabled: v }); toast.success(v ? 'Auto-expire enabled' : 'Auto-expire disabled'); }}
          label="Enable Auto-Expire"
          hint="Listings older than the threshold show an orange 'Expired' badge instead of Lost/Found"
        />
        <SettingField label="Expire After (days)" hint="Listings created more than this many days ago are considered expired">
          <div className="flex items-center gap-3">
            <input
              type="range" min={7} max={180} step={7}
              value={lfSettings.autoExpireDays}
              disabled={!lfSettings.autoExpireEnabled}
              onChange={e => setLfSettings({ autoExpireDays: +e.target.value })}
              className="w-28 cursor-pointer disabled:opacity-40 transition-all duration-300"
            />
            <span className="text-sm font-mono text-ink-300 w-16 text-right">{lfSettings.autoExpireDays} days</span>
          </div>
        </SettingField>
        {lfSettings.autoExpireEnabled && (
          <div className="mt-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <p className="text-xs text-orange-400 font-medium">Auto-expire active</p>
            <p className="text-xs text-ink-500 mt-0.5">Listings older than {lfSettings.autoExpireDays} days will display an "Expired" badge on the browse page.</p>
          </div>
        )}
      </Section>

      {/* ── Feature 2: Default Contact Info ── */}
      <Section
        icon={User}
        title="Default Contact Info"
        description="Pre-fill your name and email in the Report Item form so you don't have to retype them"
      >
        <SettingField label="Default Name" hint="Auto-filled in the 'Your Name' field when not signed in">
          <input
            type="text"
            className="input text-sm w-44 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300"
            placeholder="Your full name…"
            value={lfSettings.defaultContactName}
            onChange={e => setLfSettings({ defaultContactName: e.target.value })}
          />
        </SettingField>
        <SettingField label="Default Email" hint="Auto-filled in the 'Your Email' field when not signed in">
          <input
            type="email"
            className="input text-sm w-52 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300"
            placeholder="you@example.com"
            value={lfSettings.defaultContactEmail}
            onChange={e => setLfSettings({ defaultContactEmail: e.target.value })}
          />
        </SettingField>
        <div className="pt-1">
          <p className="text-xs text-ink-600">When you're signed in, your account email takes precedence over these defaults.</p>
        </div>
      </Section>

      {/* ── Feature 3: Display Preferences ── */}
      <Section
        icon={Sliders}
        title="Display Preferences"
        description="Configure default sort order, type filter, and pagination for the Browse page"
      >
        <SettingField label="Default Sort Order" hint="Sort applied when first opening Browse">
          <select
            className="input text-sm w-44 focus:scale-105 transition-all duration-300"
            value={lfSettings.defaultSort}
            onChange={e => { setLfSettings({ defaultSort: e.target.value }); toast.success('Default sort updated'); }}
          >
            <option value="newest">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="reward">Highest Reward</option>
          </select>
        </SettingField>
        <SettingField label="Default Type Filter" hint="Which listing type to show by default">
          <select
            className="input text-sm w-44 focus:scale-105 transition-all duration-300"
            value={lfSettings.defaultTypeFilter}
            onChange={e => { setLfSettings({ defaultTypeFilter: e.target.value }); toast.success('Default filter updated'); }}
          >
            <option value="all">All Items</option>
            <option value="lost">Lost Only</option>
            <option value="found">Found Only</option>
          </select>
        </SettingField>
        <SettingField label="Items Per Page" hint="Number of listings loaded per page (0 = show all)">
          <select
            className="input text-sm w-32 focus:scale-105 transition-all duration-300"
            value={lfSettings.itemsPerPage}
            onChange={e => { setLfSettings({ itemsPerPage: +e.target.value }); toast.success('Items per page updated'); }}
          >
            <option value={6}>6 per page</option>
            <option value={12}>12 per page</option>
            <option value={24}>24 per page</option>
            <option value={48}>48 per page</option>
            <option value={0}>Show all</option>
          </select>
        </SettingField>
        <Toggle
          value={lfSettings.defaultRewardOnly}
          onChange={(v) => { setLfSettings({ defaultRewardOnly: v }); toast.success(v ? 'Browse defaults to reward items' : 'Browse shows all items'); }}
          label="Default: Reward Items Only"
          hint="Browse page pre-filters to only show listings that offer a reward"
        />
      </Section>

      {/* ── Feature 4: Privacy Mode ── */}
      <Section
        icon={EyeOff}
        title="Privacy Mode"
        description="Mask contact names and email addresses in listings to protect personal details"
      >
        <Toggle
          value={lfSettings.privacyMode}
          onChange={(v) => { setLfSettings({ privacyMode: v }); toast.success(v ? 'Privacy mode ON — contact info masked' : 'Privacy mode OFF'); }}
          label="Enable Privacy Mode"
          hint="Contact names show only first name + initial; emails are partially hidden with a reveal toggle"
        />
        {lfSettings.privacyMode && (
          <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-xs text-accent font-medium mb-1">Privacy mode is active</p>
            <ul className="text-xs text-ink-500 space-y-0.5">
              <li>• Contact names shown as "John D." instead of "John Doe"</li>
              <li>• Emails shown as "j****@example.com" with a click-to-reveal button</li>
            </ul>
          </div>
        )}
      </Section>

      {/* ── Feature 5: Reward Highlights ── */}
      <Section
        icon={Award}
        title="Reward Highlights"
        description="Visually distinguish listings that offer a reward above your personal threshold"
      >
        <Toggle
          value={lfSettings.highlightRewards}
          onChange={(v) => { setLfSettings({ highlightRewards: v }); toast.success(v ? 'Reward highlights ON' : 'Reward highlights OFF'); }}
          label="Highlight High-Reward Listings"
          hint="Listings at or above the threshold get a golden glowing border on the browse grid"
        />
        <SettingField label="Minimum Reward ($)" hint="Listings offering this amount or more are highlighted">
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={10000} step={10}
              className="input text-sm w-24 focus:scale-105 focus:shadow-lg focus:shadow-accent/30 transition-all duration-300 disabled:opacity-40"
              disabled={!lfSettings.highlightRewards}
              value={lfSettings.minRewardHighlight}
              onChange={e => setLfSettings({ minRewardHighlight: Math.max(0, +e.target.value) })}
            />
            <span className="text-xs text-ink-500">or more</span>
          </div>
        </SettingField>
        {lfSettings.highlightRewards && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-medium">Reward highlighting active</p>
            <p className="text-xs text-ink-500 mt-0.5">Items offering ${lfSettings.minRewardHighlight}+ display with a golden glow border on the browse page.</p>
          </div>
        )}
      </Section>

    </div>
  );
}

// ── Data Management ───────────────────────────────────────────────────────────
function DataSection() {
  const { resetAll, exportSettingsJSON, importSettingsJSON } = useSettingsStore();
  const { students, clearResults } = useAppStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const importRef = useRef(null);

  const storageBytes = (() => {
    try {
      let total = 0;
      ['aa_settings', 'aa_results'].forEach(k => {
        const v = localStorage.getItem(k);
        if (v) total += new Blob([v]).size;
      });
      return total;
    } catch { return 0; }
  })();

  const handleExportSettings = () => {
    const json = exportSettingsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attendance-analyzer-settings.json';
    a.click(); URL.revokeObjectURL(url);
    toast.success('Settings exported');
  };

  const handleImportSettings = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importSettingsJSON(ev.target.result);
        toast.success('Settings imported — refresh the page to apply all changes');
      } catch {
        toast.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Storage */}
      <Section icon={HardDrive} title="Storage Usage"
        description="Data stored in your browser's localStorage">
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min((storageBytes / 51200) * 100, 100)}%` }} />
          </div>
          <span className="text-xs font-mono text-ink-400 flex-shrink-0">
            {(storageBytes / 1024).toFixed(1)} KB
          </span>
        </div>
        <p className="text-xs text-ink-600">Keys: <code className="text-ink-500">aa_settings</code>, <code className="text-ink-500">aa_results</code></p>
      </Section>

      {/* Import / Export settings */}
      <Section icon={FileJson} title="Settings Backup"
        description="Export your settings as JSON or import a previously saved backup">
        <div className="flex gap-3">
          <button onClick={handleExportSettings}
            className="flex items-center gap-2 text-sm border border-ink-700 rounded-lg px-4 py-2 text-ink-300 hover:border-accent hover:text-accent hover:bg-accent/5 hover:scale-105 hover:shadow-lg hover:shadow-accent/30 transition-all duration-300">
            <Download size={14} />Export JSON
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 text-sm border border-ink-700 rounded-lg px-4 py-2 text-ink-300 hover:border-accent hover:text-accent hover:bg-accent/5 hover:scale-105 hover:shadow-lg hover:shadow-accent/30 transition-all duration-300">
            <FileJson size={14} />Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportSettings} />
        </div>
      </Section>

      {/* Danger zone */}
      <Section icon={AlertCircle} title="Danger Zone"
        description="Irreversible actions — proceed with caution">
        <div className="space-y-3">
          {/* Clear results */}
          <div className="flex items-center justify-between gap-4 py-3 border-b border-ink-800/60">
            <div>
              <p className="text-sm text-ink-200">Clear Saved Results</p>
              <p className="text-xs text-ink-600 mt-0.5">
                Remove the {students.length > 0 ? `${students.length} students'` : ''} analysis data from browser storage
              </p>
            </div>
            {confirmClear ? (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { clearResults(); setConfirmClear(false); toast.success('Results cleared'); }}
                  className="text-xs px-3 py-1.5 rounded bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 hover:scale-105 hover:shadow-lg hover:shadow-danger/30 transition-all duration-300">
                  Confirm
                </button>
                <button onClick={() => setConfirmClear(false)} className="text-xs px-3 py-1.5 rounded border border-ink-700 text-ink-400 hover:border-ink-500 hover:scale-105 transition-all duration-300">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs text-danger border border-danger/30 rounded-lg px-3 py-1.5 hover:bg-danger/10 hover:scale-105 hover:shadow-lg hover:shadow-danger/30 transition-all duration-300">
                <Trash2 size={12} />Clear
              </button>
            )}
          </div>

          {/* Factory reset */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm text-ink-200">Factory Reset Settings</p>
              <p className="text-xs text-ink-600 mt-0.5">Reset all preferences, presets, and appearance to defaults</p>
            </div>
            {confirmReset ? (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => { resetAll(); setConfirmReset(false); toast.success('Settings reset to factory defaults'); window.location.reload(); }}
                  className="text-xs px-3 py-1.5 rounded bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 hover:scale-105 hover:shadow-lg hover:shadow-danger/30 transition-all duration-300">
                  Confirm & Reload
                </button>
                <button onClick={() => setConfirmReset(false)} className="text-xs px-3 py-1.5 rounded border border-ink-700 text-ink-400 hover:border-ink-500 hover:scale-105 transition-all duration-300">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmReset(true)}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs text-danger border border-danger/30 rounded-lg px-3 py-1.5 hover:bg-danger/10 hover:scale-105 hover:shadow-lg hover:shadow-danger/30 transition-all duration-300">
                <RefreshCw size={12} />Reset All
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const location = useLocation();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const tabs = [
    { id: 'appearance', label: 'Appearance',  icon: Palette   },
    { id: 'presets',    label: 'Presets',     icon: Bookmark  },
    { id: 'display',    label: 'Display',     icon: Table2    },
    { id: 'advanced',   label: 'Advanced',    icon: Zap       },
    { id: 'lostfound',  label: 'Lost & Found',icon: Package   },
    { id: 'account',    label: 'Account',     icon: User      },
    { id: 'data',       label: 'Data',        icon: Database  },
  ];

  const [activeTab, setActiveTab] = useState('appearance');

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar — vertical on desktop, horizontal scrollable tabs on mobile */}
      <aside className={`
        md:w-52 md:border-r md:border-ink-800 md:flex-col md:flex-shrink-0 md:pt-4
        border-b border-ink-800 bg-ink-950
        transition-all duration-700
        ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 md:-translate-x-full'}
      `} style={{transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'}}>

        {/* Desktop: label header */}
        <div className="hidden md:block px-4 mb-4 animate-in fade-in duration-700" style={{animationDelay: '100ms'}}>
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-accent" />
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider" style={{ fontFamily: 'Syne' }}>
              Settings
            </span>
          </div>
        </div>

        {/* Mobile: horizontal scrollable tab bar */}
        <div className="flex md:hidden overflow-x-auto hide-scrollbar px-2 py-2 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-300 ${
                activeTab === id
                  ? 'mirror-nav-active text-ink-900'
                  : 'mirror-nav text-ink-500'
              }`}
              style={activeTab === id ? { color: '#000000' } : {}}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Desktop: vertical nav */}
        <nav className="hidden md:flex flex-col gap-0.5 px-2 overflow-y-auto">
          {tabs.map(({ id, label, icon: Icon }, idx) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`sidebar-item rounded-lg text-sm transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-left ${activeTab === id ? 'active scale-105 shadow-lg shadow-accent/30' : 'hover:shadow-lg hover:shadow-accent/20'}`}
              style={{animationDelay: `${150 + idx * 50}ms`}}>
              <Icon size={15} />
              <span>{label}</span>
              {activeTab === id && <ChevronRight size={12} className="ml-auto text-ink-500" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className={`flex-1 overflow-y-auto transition-all duration-700 ${
        animateIn ? 'opacity-100 translate-y-0 appstore-drop' : 'opacity-0 translate-y-10'
      }`} style={{transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
        <div className="p-4 sm:p-6 w-full space-y-5 pb-8">
          <div className="mb-2 animate-in fade-in slide-in-from-top duration-700" style={{animationDelay: '200ms'}}>
            <h1 className="text-xl font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>Settings</h1>
            <p className="text-xs text-ink-500 mt-1">Preferences are saved to your browser automatically</p>
          </div>

          {activeTab === 'appearance' && <div className="animate-in fade-in duration-500"><AppearanceSection /></div>}
          {activeTab === 'presets'    && <div className="animate-in fade-in duration-500"><PresetsSection /></div>}
          {activeTab === 'display'    && <div className="animate-in fade-in duration-500"><TableSection /></div>}
          {activeTab === 'advanced'   && <div className="animate-in fade-in duration-500"><AdvancedSection /></div>}
          {activeTab === 'lostfound'  && <div className="animate-in fade-in duration-500"><LostFoundSection /></div>}
          {activeTab === 'account'    && <div className="animate-in fade-in duration-500"><AccountSection /></div>}
          {activeTab === 'data'       && <div className="animate-in fade-in duration-500"><DataSection /></div>}
        </div>
      </main>
    </div>
  );
}
