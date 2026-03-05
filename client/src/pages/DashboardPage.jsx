import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileSpreadsheet, X, Play, RotateCcw,
  Download, FileText, Printer, Users, User, Info, Sliders, Bell, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import SplashScreen from '../components/SplashScreen';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAnimeIn } from '../hooks/useScrollAnimation';
import { parseExcelFile } from '../utils/excelParser';
import { analyzeAttendance, autoDetectClassTimes } from '../utils/scoring';
import { exportCSV, exportTXT, exportPDF } from '../utils/exporters';
import anime, { staggerIn } from '../utils/animations';
import { authApi } from '../api';

const SCORE_COLORS = { high: '#094067', mid: '#5f6c7b', low: '#ef4565' };
const PIE_COLORS = ['#008080', '#ff7722', '#9B1C31'];

function getScoreColor(score, max, highPct = 90, midPct = 70) {
  const pct = (score / max) * 100;
  if (pct >= highPct) return SCORE_COLORS.high;
  if (pct >= midPct)  return SCORE_COLORS.mid;
  return SCORE_COLORS.low;
}

function getGrade(score, max, thresholds) {
  if (!thresholds?.length) return null;
  const pct = (score / max) * 100;
  const sorted = [...thresholds].sort((a, b) => b.min - a.min);
  return sorted.find(t => pct >= t.min) || sorted[sorted.length - 1];
}

function GradeBadge({ gradeObj }) {
  if (!gradeObj) return <span className="text-ink-600 text-xs">—</span>;
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: gradeObj.color }}>
      {gradeObj.grade}
    </span>
  );
}

function anonymizeStudents(students) {
  return students.map((s, i) => ({
    ...s,
    name: `Student ${String(i + 1).padStart(3, '0')}`,
    id: undefined,
  }));
}

function RoleBadge({ role }) {
  const isOrganizer = role?.toLowerCase() === 'organizer';
  const isPresenter = role?.toLowerCase() === 'presenter';
  
  if (isOrganizer) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-ink-700/50 text-ink-300 border border-ink-600/50">
        Organizer
      </span>
    );
  }
  
  if (isPresenter) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold bg-ink-700/50 text-ink-300 border border-ink-600/50">
        Presenter
      </span>
    );
  }
  
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-ink-800 text-ink-400">
      Attendee
    </span>
  );
}

// ── Card with Hover Effect ────────────────────────────────────────────────────
function CardWithHover({ children, animDelay = 0 }) {
  const ref = useAnimeIn({ delay: typeof animDelay === 'string' ? parseInt(animDelay) || 0 : animDelay, duration: 700, distance: 20 });
  return (
    <div ref={ref} className="card p-5 group card-spring relative" style={{ willChange: 'transform, opacity' }}>
      {children}
    </div>
  );
}

// ── Stat Card with anime.js spring entrance ────────────────────────────────────
function StatCard({ stat, index }) {
  const ref = useAnimeIn({ delay: 180 + index * 75, duration: 650, distance: 22 });
  const valueRef = useRef(null);
  const hasAnimated = useRef(false);

  // Counter-up animation for numeric values
  useEffect(() => {
    if (hasAnimated.current || !valueRef.current) return;
    const raw = typeof stat.value === 'number' ? stat.value : parseFloat(stat.value);
    if (isNaN(raw)) return;

    hasAnimated.current = true;
    const isDecimal = String(stat.value).includes('.');
    const obj = { count: 0 };
    anime({
      targets: obj,
      count: raw,
      duration: 1000,
      delay: 200 + index * 80,
      easing: 'easeOutExpo',
      update() {
        if (valueRef.current) {
          valueRef.current.textContent = isDecimal ? obj.count.toFixed(1) : Math.round(obj.count);
        }
      },
    });
  }, [stat.value, index]);

  return (
    <div ref={ref} className="card p-4 relative group card-spring shine-line" style={{ willChange: 'transform, opacity' }}>
      <p className="text-xs text-ink-500 mb-1 transition-all duration-300 group-hover:text-accent" style={{ fontFamily: 'Syne' }}>
        {stat.label.toUpperCase()}
      </p>
      <p ref={valueRef} className="text-2xl font-bold transition-all duration-300 group-hover:scale-110 group-hover:text-accent origin-left counter-el"
        style={{ fontFamily: 'Syne', color: stat.color }}>
        {stat.value}
      </p>
      {stat.hint && (
        <p className="text-xs text-ink-600 mt-1 transition-all duration-300 group-hover:text-ink-400">{stat.hint}</p>
      )}
    </div>
  );
}

// ── iPhone-style wheel picker ──────────────────────────────────────────────────

function WheelColumn({ items, selected, onChange, disabled, format }) {
  const ref = useRef(null);
  const isProgrammatic = useRef(false);
  const ITEM_HEIGHT = 40;
  const PADDING = 2;

  useEffect(() => {
    if (!ref.current) return;
    isProgrammatic.current = true;
    const idx = items.indexOf(selected);
    ref.current.scrollTop = (idx < 0 ? 0 : idx) * ITEM_HEIGHT;
    const t = setTimeout(() => { isProgrammatic.current = false; }, 200);
    return () => clearTimeout(t);
  }, [selected, items]);

  const handleScroll = useCallback(() => {
    if (isProgrammatic.current || !ref.current) return;
    const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped] !== selected) onChange(items[clamped]);
  }, [items, selected, onChange]);

  return (
    <div className="relative flex-1" style={{ height: ITEM_HEIGHT * 5, overflow: 'hidden' }}>
      {/* Top mirror fade */}
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0) 100%)' }} />
      {/* Bottom mirror fade */}
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0) 100%)' }} />
      {/* Cylindrical side-lighting — darker at edges, bright in center, simulates a curved drum */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(200,215,230,0.22) 0%, transparent 28%, transparent 72%, rgba(200,215,230,0.22) 100%)' }} />
      {/* Center selection rail — frosted mirror */}
      <div className="absolute inset-x-2 z-10 pointer-events-none rounded-xl"
        style={{
          top: ITEM_HEIGHT * PADDING,
          height: ITEM_HEIGHT,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(235,243,252,0.7) 50%, rgba(220,232,245,0.5) 100%)',
          borderTop: '1.5px solid rgba(255,255,255,1)',
          borderBottom: '1.5px solid rgba(160,185,210,0.55)',
          boxShadow: '0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.07) inset, 0 2px 10px rgba(0,0,0,0.1)',
        }} />

      <div ref={ref} onScroll={handleScroll} className="wheel-scroll h-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory' }}>
        {Array.from({ length: PADDING }).map((_, i) => (
          <div key={`t${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        {items.map((item, idx) => {
          const dist = Math.abs(idx - items.indexOf(selected));
          const color =
            dist === 0 ? 'rgb(var(--accent))' :
            dist === 1 ? '#3d5a70' :
                         '#7a9ab0';
          return (
            <div key={item} onClick={() => !disabled && onChange(item)}
              style={{
                height: ITEM_HEIGHT, scrollSnapAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: dist === 0 ? '22px' : dist === 1 ? '15px' : '12px',
                fontWeight: dist === 0 ? 700 : dist === 1 ? 500 : 300,
                color,
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'default' : 'pointer',
                userSelect: 'none', transition: 'font-size 0.12s, color 0.12s',
              }}>
              {format(item)}
            </div>
          );
        })}
        {Array.from({ length: PADDING }).map((_, i) => (
          <div key={`b${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
}

function TimeWheelPicker({ value, onChange, disabled }) {
  const [hStr, mStr] = value.split(':');
  const hours = parseInt(hStr) || 0;
  const minutes = parseInt(mStr) || 0;
  const pad = (n) => String(n).padStart(2, '0');
  const hourItems = Array.from({ length: 24 }, (_, i) => i);
  const minuteItems = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div
      className={`flex items-stretch rounded-2xl overflow-hidden bg-white ${disabled ? 'opacity-60' : ''}`}
      style={{
        height: 40 * 5,
        border: disabled ? '2px solid #cbd5e1' : '2px solid rgba(var(--accent),0.6)',
        boxShadow: disabled ? 'none' : '0 0 0 4px rgba(var(--accent),0.1), 0 4px 16px rgba(0,0,0,0.1)',
      }}>
      <WheelColumn items={hourItems} selected={hours} disabled={disabled} format={pad}
        onChange={(h) => !disabled && onChange(`${pad(h)}:${pad(minutes)}`)} />
      <div className="flex flex-col items-center justify-center gap-2.5 px-1 select-none">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(var(--accent),0.5)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(var(--accent),0.5)' }} />
      </div>
      <WheelColumn items={minuteItems} selected={minutes} disabled={disabled} format={pad}
        onChange={(m) => !disabled && onChange(`${pad(hours)}:${pad(m)}`)} />
    </div>
  );
}

// ── Threshold slider with preset chips ────────────────────────────────────────

function ThresholdStepper({ label, value, onChange, min, max, step = 1, presets }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="font-mono text-sm font-bold text-accent tabular-nums">{value}m</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-2 rounded-full cursor-pointer accent-[rgb(var(--accent))]"
        style={{
          background: `linear-gradient(to right,
            rgb(var(--accent)) 0%,
            rgb(var(--accent)) ${pct}%,
            rgba(190,212,232,0.55) ${pct}%,
            rgba(190,212,232,0.55) 100%)`,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08), inset 0 -1px 0 rgba(255,255,255,0.7)',
        }}
      />
      <div className="flex justify-between text-[10px] font-mono mt-1 mb-2.5 select-none" style={{ color: '#5f6c7b' }}>
        <span>{min}m</span><span>{max}m</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`text-xs px-2.5 py-1 rounded-lg font-mono active:scale-95 transition-all duration-150 ${
              value === p ? 'text-accent font-semibold' : 'text-ink-400'
            }`}
            style={value === p ? {
              background: 'linear-gradient(180deg, rgba(var(--accent),0.18) 0%, rgba(var(--accent),0.08) 100%)',
              border: '1px solid rgba(var(--accent),0.45)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(var(--accent),0.15)',
            } : {
              background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(218,236,252,0.38) 100%)',
              border: '1px solid rgba(145,185,218,0.45)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(160,195,225,0.2), 0 2px 6px rgba(0,0,0,0.06)',
            }}>
            {p}m
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Config panel ───────────────────────────────────────────────────────────────

function ConfigPanel({ hasChanges, onApply, onCancel, hasGoBack, onGoBack }) {
  const { config, setConfig, resetConfig, numSessions } = useAppStore();

  // Validate and clamp config values
  const validateMaxScore = (val) => {
    const num = +val;
    if (num < 1) { toast.error('Max score must be at least 1'); return; }
    setConfig({ maxScore: num });
  };

  const validateLatePenalty = (val) => {
    const num = +val;
    if (num < 0) { toast.error('Late penalty cannot be negative'); return; }
    setConfig({ latePenalty: num });
  };

  const validateAbsentPenalty = (val) => {
    const num = +val;
    if (num < 0) { toast.error('Absent penalty cannot be negative'); return; }
    setConfig({ absentPenalty: num });
  };

  const mirrorCard = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(230,242,254,0.65) 100%)',
    border: '1px solid rgba(175,205,228,0.55)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(0,0,0,0.06)',
    borderRadius: '14px',
    padding: '14px',
  };

  // iPhone-style glass button — secondary/ghost
  const mirrorBtn = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(218,236,252,0.38) 100%)',
    border: '1px solid rgba(145,185,218,0.45)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(160,195,225,0.2), 0 2px 6px rgba(0,0,0,0.06)',
    borderRadius: '10px',
  };

  // iPhone-style glass button — primary/accent
  const mirrorBtnPrimary = {
    background: 'linear-gradient(180deg, rgb(var(--accent) / 0.82) 0%, rgb(var(--accent) / 1) 100%)',
    border: '1px solid rgb(var(--accent) / 0.9)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 3px 10px rgb(var(--accent) / 0.35)',
    borderRadius: '10px',
  };

  return (
    <div className="space-y-4">
      {/* Class Schedule */}
      <div style={mirrorCard}>
        <p className="label mb-3">Class Schedule</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-500 mb-2 block">Start</label>
            <TimeWheelPicker value={config.classStart} disabled={config.timesLocked}
              onChange={v => setConfig({ classStart: v })} />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-2 block">End</label>
            <TimeWheelPicker value={config.classEnd} disabled={config.timesLocked}
              onChange={v => setConfig({ classEnd: v })} />
          </div>
        </div>
        {config.timesLocked && (
          <button onClick={() => setConfig({ timesLocked: false })}
            className="text-xs text-ink-400 hover:text-accent px-3 py-1 mt-2 flex items-center gap-1.5 active:scale-95 transition-all duration-150"
            style={mirrorBtn}>
            Override lock
          </button>
        )}
      </div>

      {/* Thresholds */}
      <div style={mirrorCard}>
        <p className="label mb-3">Thresholds (minutes)</p>
        <div className="space-y-4">
          <ThresholdStepper
            label="Late after"
            value={config.lateThreshold}
            onChange={v => setConfig({ lateThreshold: v })}
            min={0} max={60} step={1}
            presets={[5, 10, 15, 20, 30]}
          />
          <ThresholdStepper
            label="Absent after"
            value={config.absentThreshold}
            onChange={v => setConfig({ absentThreshold: v })}
            min={0} max={240} step={5}
            presets={[20, 30, 45, 60, 90]}
          />
        </div>
      </div>

      {/* Scoring */}
      <div style={mirrorCard}>
        <div className="flex items-center justify-between mb-3">
          <p className="label">Scoring</p>
          <button onClick={resetConfig}
            className="text-xs text-ink-400 px-3 py-1 flex items-center gap-1.5 active:scale-95 transition-all duration-150 hover:text-accent"
            style={mirrorBtn}>
            <RotateCcw size={11} />Manual
          </button>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Max Score</label>
            <input type="number" className="input text-sm" value={config.maxScore} min={1}
              onChange={e => validateMaxScore(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Late penalty</label>
              <input type="number" className="input text-sm" value={config.latePenalty} min={0} step={0.5}
                onChange={e => validateLatePenalty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Absent penalty</label>
              <input type="number" className="input text-sm" value={config.absentPenalty} min={0} step={0.5}
                onChange={e => validateAbsentPenalty(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-xl p-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(218,236,252,0.6) 100%)',
            border: '1px solid rgba(165,200,228,0.55)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 6px rgba(0,0,0,0.06)',
          }}>
          <p className="text-xs text-ink-400 font-mono leading-relaxed">
            Max = {config.maxScore} × {numSessions || '?'} sessions = <span className="text-accent">{config.maxScore * (numSessions || 1)}</span><br />
            Score = Max − (Late × {config.latePenalty})<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− (Absent × {config.absentPenalty})
          </p>
        </div>
      </div>

      {/* Cancel / Apply — shown when config differs from last analysis */}
      {hasChanges && (
        <div className="pt-2 border-t border-ink-800 space-y-2">
          <p className="text-xs text-warning font-medium">Unsaved changes</p>
          <button onClick={onApply}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-all duration-150"
            style={mirrorBtnPrimary}>
            <Play size={12} />Apply Change
          </button>
          <button onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-ink-400 hover:text-ink-200 active:scale-[0.98] transition-all duration-150"
            style={mirrorBtn}>
            <RotateCcw size={12} />Cancel Change
          </button>
        </div>
      )}

      {/* Go Back — shown after Apply was used at least once */}
      {hasGoBack && !hasChanges && (
        <div className="pt-2 border-t border-ink-800 space-y-2">
          <p className="text-xs text-ink-500">Original auto-detected analysis</p>
          <button onClick={onGoBack}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-accent hover:text-accent-hover active:scale-[0.98] transition-all duration-150"
            style={mirrorBtn}>
            <RotateCcw size={12} />Go Back to Original
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dynamic student table row ─────────────────────────────────────────────────

function StudentRow({ student, isSelected, onSelect, colDefs, rowIndex }) {
  const [isHovered, setIsHovered] = useState(false);
  const isOrganizer = student.role?.toLowerCase() === 'organizer';
  const isPresenter = student.role?.toLowerCase() === 'presenter';

  const rowBg = isOrganizer
    ? (isHovered ? 'bg-ink-800/60' : 'bg-ink-800/40')
    : isPresenter
    ? (isHovered ? 'bg-ink-900/50' : 'bg-ink-900/30')
    : rowIndex % 2 === 0
    ? (isHovered ? 'bg-ink-900/40' : 'bg-ink-900/20')
    : (isHovered ? 'bg-ink-900/40' : '');

  return (
    <tr
      onClick={() => onSelect(student)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer"
    >
      {colDefs.map((col, i) => {
        const isFirst = i === 0;
        const isLast = i === colDefs.length - 1;
        return (
          <td key={col.id}
            className={`whitespace-nowrap text-sm transition-all duration-300 align-middle
              ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
              ${isSelected
                ? `py-9 px-7 text-base bg-white text-black font-bold selected-row-mirror
                   ${isFirst ? 'rounded-l-3xl row-pill-left' : ''}
                   ${isLast  ? 'rounded-r-3xl row-pill-right' : ''}
                   ${!isLast ? 'border-r border-white/20' : ''}`
                : `py-4 px-5 ${rowBg} text-ink-300 border-b border-ink-700/50 transition-all duration-300
                   ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl' : ''}
                   ${isHovered ? 'brightness-125 shadow-md shadow-accent/20' : ''}
                   ${!isLast ? 'border-r border-ink-700/30' : ''}`
              }
            `}>
            {col.render(student)}
          </td>
        );
      })}
    </tr>
  );
}

// ── Individual detail section ─────────────────────────────────────────────────

function IndividualSection({ student, maxScore, onClose }) {
  if (!student) return null;

  const scoreColor = getScoreColor(student.score, maxScore);
  const pct = (student.score / maxScore) * 100;

  return (
    <div className="card animate-slide-up shadow-lg shadow-accent/10 border border-accent/20">
      {/* Header */}
      <div className="p-5 border-b border-accent/30 bg-gradient-to-r from-accent/10 to-transparent flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center flex-shrink-0 border border-accent/20">
          <User size={20} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>
              {student.name}
            </h3>
            <RoleBadge role={student.role} />
          </div>
          <div className="flex items-center gap-4 mt-2">
            {student.id && (
              <span className="text-xs text-ink-500 font-mono bg-ink-900/50 px-2 py-1 rounded">{student.id}</span>
            )}
            <span className="text-xs text-ink-500">
              {student.firstDate && student.lastDate
                ? `${student.firstDate} → ${student.lastDate}`
                : student.firstDate || ''}
            </span>
          </div>
        </div>

        {/* Score block */}
        <div className="text-right flex-shrink-0 bg-ink-900/50 rounded-lg p-3 border border-ink-700/50">
          <p className="text-3xl font-bold leading-none" style={{ color: scoreColor, fontFamily: 'Syne' }}>
            {student.score.toFixed(1)}
            <span className="text-sm text-ink-600 font-normal">/{maxScore}</span>
          </p>
          <div className="mt-3 flex flex-col gap-1.5 text-xs font-semibold space-y-0.5">
            <div className="flex items-center justify-end gap-1.5">
              <span style={{ color: '#008080' }}>✓</span>
              <span className="text-ink-300">{student.normal} on-time</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span style={{ color: '#ff7722' }}>⚠</span>
              <span className="text-ink-300">{student.late} late</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span style={{ color: '#9B1C31' }}>✕</span>
              <span className="text-ink-300">{student.absent} absent</span>
            </div>
          </div>
        </div>

        <button onClick={onClose}
          className="text-ink-600 hover:text-accent transition-colors flex-shrink-0 hover:bg-accent/10 rounded-lg p-1.5">
          <X size={18} />
        </button>
      </div>

      {/* Score bar */}
      <div className="px-5 py-4 border-b border-accent/20">
        <div className="flex items-center justify-between text-xs font-semibold text-ink-400 mb-2.5">
          <span>SCORE PROGRESS</span>
          <span className="text-accent">{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 bg-ink-800 rounded-full overflow-hidden border border-ink-700/50">
          <div className="h-full rounded-full transition-all duration-700 shadow-lg"
            style={{ width: `${pct}%`, backgroundColor: scoreColor, boxShadow: `0 0 12px ${scoreColor}40` }} />
        </div>
      </div>

      {/* Session breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
              {['#', 'Session File', 'Date', 'Join Time', 'Status'].map((h, i) => (
                <th key={h}
                  className={`py-3.5 px-5 text-xs font-bold text-accent tracking-wider
                    ${i === 0 ? 'w-8 text-center' :
                      i === 1 ? 'text-left' :
                      i === 4 ? 'text-right' : 'text-left'}`}
                  style={{ fontFamily: 'Syne', letterSpacing: '0.1em' }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student.sessions.map((s, i) => (
              <tr key={i} className={`border-b border-ink-700/40 transition-all duration-200 ${
                i % 2 === 0 ? 'bg-ink-900/20' : ''
              } hover:bg-accent/8`}>
                <td className="py-3.5 px-5 text-xs text-ink-500 text-center font-semibold">{i + 1}</td>
                <td className="py-3.5 px-5 text-xs text-ink-300 max-w-[240px] truncate font-medium">
                  {s.filename}
                </td>
                <td className="py-3.5 px-5 text-xs text-ink-400 whitespace-nowrap">
                  {s.date || '—'}
                </td>
                <td className="py-3.5 px-5 text-xs font-mono text-ink-400 whitespace-nowrap">
                  {s.joinTime || '—'}
                </td>
                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                  <span className={`badge-${s.status.toLowerCase()} font-semibold`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(location.state?.justLoggedIn ?? false);
  const [animateIn, setAnimateIn] = useState(false); // Start as false when splash is shown
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'edit'

  useEffect(() => {
    // Only trigger animation on route changes when there's NO splash screen
    if (!showSplash) {
      setAnimateIn(false);
      const timer = setTimeout(() => setAnimateIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, showSplash]);

  useEffect(() => {
    // When splash screen completes, trigger the drop-in animation
    if (!showSplash) {
      setAnimateIn(false);
      const timer = setTimeout(() => setAnimateIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  const {
    config, setConfig, committedConfig, commitConfig, originalConfig,
    setOriginalConfig, clearCommittedConfig, students, numSessions, fileNames,
    setResults, clearResults, resultsRestoredAt, clearPersistedOnly,
    parsedFiles, setParsedFiles, addParsedFiles, removeParsedFile, clearParsedFiles,
    selectedFileNames, setSelectedFiles, toggleFileSelection, selectAllFiles, deselectAllFiles,
  } = useAppStore();
  const {
    rowsPerPage, defaultSort, exportFormat, setExportFormat,
    visibleColumns, gradeThresholds,
    highScoreThreshold, midScoreThreshold,
    atRiskThreshold, autoReanalyze, anonymizeExports,
  } = useSettingsStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [page, setPage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chartType, setChartType] = useState('histogram'); // 'histogram' or 'pie'
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
  const isFirstRender = useRef(true);
  const handleAnalyzeRef = useRef(null);
  const lastDetectedTimesRef = useRef(null);
  const fileListRef = useRef(null);

  // Stagger-animate file list items whenever parsedFiles changes
  useEffect(() => {
    if (!fileListRef.current || !parsedFiles.length) return;
    const items = fileListRef.current.querySelectorAll('[data-stagger]');
    if (!items.length) return;
    items.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(12px) scale(0.97)'; });
    staggerIn(items, { delay: 45, duration: 500, distance: 12 });
  }, [parsedFiles.length]);

  // Check for accepted message requests and show notifications
  useEffect(() => {
    const checkAcceptedRequests = async () => {
      try {
        const { data } = await authApi.getMessageRequests();
        const accepted = data.requests?.filter(r => r.status === 'accepted' && r.type === 'outgoing') || [];
        
        // Filter out already dismissed notifications
        const newAccepted = accepted.filter(r => !dismissedNotifications.has(r.id));
        
        if (newAccepted.length > 0) {
          newAccepted.forEach(req => {
            toast.custom((t) => (
              <div className="bg-green-500/20 border border-green-500/50 rounded p-2 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top">
                <Bell size={14} className="text-green-500 flex-shrink-0 animate-pulse" />
                <span className="text-ink-100">Request accepted ✓</span>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-ink-600 hover:text-ink-400 ml-auto"
                >
                  <X size={12} />
                </button>
              </div>
            ), { duration: 4000 });
            
            // Mark this notification as dismissed
            setDismissedNotifications(prev => new Set(prev).add(req.id));
          });
        }
      } catch (error) {
        console.error('Failed to check message requests:', error);
      }
    };

    // Check on component mount and periodically
    checkAcceptedRequests();
    const interval = setInterval(checkAcceptedRequests, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [dismissedNotifications]);

  const onDrop = useCallback(async (accepted) => {
    const xlsxFiles = accepted.filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.xlsm') || f.name.endsWith('.csv') || f.name.endsWith('.pdf') || f.name.endsWith('.docx')
    );
    if (!xlsxFiles.length) {
      toast.error('Please upload Excel (.xlsx, .xls, .xlsm), CSV, PDF, or Word (.docx) files');
      return;
    }

    const toastId = toast.loading(`Parsing ${xlsxFiles.length} file(s)...`);
    try {
      const parsed = await Promise.all(xlsxFiles.map(parseExcelFile));
      
      // Check for files with correct format but no readable data
      const invalidFiles = parsed.filter(p => !p.records || p.records.length === 0);
      if (invalidFiles.length > 0) {
        const invalidNames = invalidFiles.map(f => f.filename).join(', ');
        toast.error(`Could not read data from: ${invalidNames}. Please ensure the files contain valid attendance records with headers like Name, ID, Join Time, and Role.`, { id: toastId });
        return;
      }

      addParsedFiles(parsed);
      // Auto-select newly added files
      setSelectedFiles([...selectedFileNames, ...parsed.map(p => p.filename)]);

      if (!config.timesLocked) {
        const detected = autoDetectClassTimes(parsed);
        if (detected) {
          setConfig({ classStart: detected.start, classEnd: detected.end, timesLocked: true });
          toast.success(`Auto-detected class time: ${detected.start}`, { id: toastId });
        } else {
          toast.success(`Loaded ${xlsxFiles.length} file(s)`, { id: toastId });
        }
      } else {
        toast.success(`Added ${xlsxFiles.length} file(s)`, { id: toastId });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to parse file. Please upload a correct file type.', { id: toastId });
    }
  }, [config.timesLocked, addParsedFiles, setConfig, selectedFileNames, setSelectedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  const handleAnalyze = async () => {
    if (!parsedFiles.length) { toast.error('Upload files first'); return; }
    if (!selectedFileNames.length) { toast.error('Select at least one file to analyze'); return; }

    // Validate config before analysis
    if (config.maxScore < 1) { toast.error('Max score must be at least 1'); return; }
    if (config.latePenalty < 0) { toast.error('Late penalty cannot be negative'); return; }
    if (config.absentPenalty < 0) { toast.error('Absent penalty cannot be negative'); return; }
    if (config.lateThreshold < 0) { toast.error('Late threshold must be non-negative'); return; }
    if (config.absentThreshold < 0) { toast.error('Absent threshold must be non-negative'); return; }

    setIsAnalyzing(true);
    setSelectedStudent(null);
    await new Promise(r => setTimeout(r, 50));
    try {
      // Filter files to only analyze selected ones
      const filesToAnalyze = parsedFiles.filter(f => selectedFileNames.includes(f.filename));
      const results = analyzeAttendance(filesToAnalyze, config);
      if (!results || !Array.isArray(results)) {
        toast.error('Analysis produced invalid results');
        return;
      }
      setResults(results, filesToAnalyze.length, filesToAnalyze.map(f => f.filename));
      commitConfig();
      if (!originalConfig) setOriginalConfig();
      toast.success(`Analyzed ${results.length} students across ${filesToAnalyze.length} sessions`);
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    clearParsedFiles();
    clearResults();
    clearCommittedConfig();
    setConfig({ timesLocked: false });
    setSelectedStudent(null);
    setSelectedFiles([]);
  };

  const handleGoBack = async () => {
    if (!parsedFiles.length || !originalConfig) return;
    setIsAnalyzing(true);
    setSelectedStudent(null);
    setConfig({ ...originalConfig });
    await new Promise(r => setTimeout(r, 50));
    try {
      const results = analyzeAttendance(parsedFiles, originalConfig);
      if (!results || !Array.isArray(results)) {
        toast.error('Analysis produced invalid results');
        return;
      }
      setResults(results, parsedFiles.length, parsedFiles.map(f => f.filename));
      commitConfig();
      toast.success('Restored original analysis');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeFile = (filename) => {
    removeParsedFile(filename);
    if (parsedFiles.length <= 1) { clearResults(); setConfig({ timesLocked: false }); }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(prev => prev?.name === student.name ? null : student);
  };

  // Keep ref current so auto-reanalyze effect doesn't go stale
  useEffect(() => { handleAnalyzeRef.current = handleAnalyze; });

  // Auto-recalculate class times when selected files change
  useEffect(() => {
    if (selectedFileNames.length === 0 || config.timesLocked || parsedFiles.length === 0) return;
    
    // Get only the selected files
    const selectedFiles = parsedFiles.filter(f => selectedFileNames.includes(f.filename));
    if (selectedFiles.length === 0) return;
    
    // Recalculate class times based on selected files
    const detected = autoDetectClassTimes(selectedFiles);
    if (detected) {
      // Only update if the times have actually changed
      const timesChanged = !lastDetectedTimesRef.current || 
        lastDetectedTimesRef.current.start !== detected.start || 
        lastDetectedTimesRef.current.end !== detected.end;
      
      if (timesChanged) {
        lastDetectedTimesRef.current = detected;
        setConfig({ classStart: detected.start, classEnd: detected.end });
      }
    }
  }, [selectedFileNames, parsedFiles, config.timesLocked, setConfig]);

  // Auto-reanalyze: re-run when scoring config changes if enabled and files are loaded
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!autoReanalyze || !parsedFiles.length || !students.length || isAnalyzing) return;
    const t = setTimeout(() => handleAnalyzeRef.current?.(), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.classStart, config.classEnd, config.lateThreshold, config.absentThreshold,
      config.maxScore, config.latePenalty, config.absentPenalty]);

  // Build dynamic column definitions based on visibleColumns setting
  const colDefs = [
    {
      id: 'role', label: 'Role', align: 'left',
      render: (s) => <RoleBadge role={s.role} />,
    },
    {
      id: 'name', label: 'Name', align: 'left',
      render: (s) => {
        const isOrg = s.role?.toLowerCase() === 'organizer';
        const isPre = s.role?.toLowerCase() === 'presenter';
        return (
          <span className={`text-sm ${isOrg ? 'font-bold text-ink-50' : isPre ? 'font-semibold text-ink-100' : 'text-ink-200'}`}>
            {s.name}
          </span>
        );
      },
    },
    {
      id: 'id', label: 'ID', align: 'left',
      render: (s) => s.id
        ? <span className="text-xs font-mono bg-ink-800/40 px-2 py-0.5 rounded text-ink-300">{s.id}</span>
        : <span className="text-ink-600 text-xs">—</span>,
    },
    {
      id: 'firstDate', label: 'First Date', align: 'left',
      render: (s) => <span className="text-xs text-ink-400">{s.firstDate || '—'}</span>,
    },
    {
      id: 'lastDate', label: 'Last Date', align: 'left',
      render: (s) => <span className="text-xs text-ink-400">{s.lastDate || '—'}</span>,
    },
    {
      id: 'totalClasses', label: 'Total', align: 'center',
      render: (s) => s.role?.toLowerCase() === 'organizer'
        ? <span className="text-ink-700 text-xs">—</span>
        : <span className="text-sm font-medium text-ink-300">{s.normal + s.late + s.absent}</span>,
    },
    {
      id: 'onTime', label: 'On-Time', align: 'center',
      render: (s) => s.role?.toLowerCase() === 'organizer'
        ? <span className="text-ink-700 text-xs">—</span>
        : <span className="badge-normal">{s.normal}</span>,
    },
    {
      id: 'late', label: 'Late', align: 'center',
      render: (s) => s.role?.toLowerCase() === 'organizer'
        ? <span className="text-ink-700 text-xs">—</span>
        : <span className="badge-late">{s.late}</span>,
    },
    {
      id: 'absent', label: 'Absent', align: 'center',
      render: (s) => s.role?.toLowerCase() === 'organizer'
        ? <span className="text-ink-700 text-xs">—</span>
        : <span className="badge-absent">{s.absent}</span>,
    },
    {
      id: 'grade', label: 'Grade', align: 'center',
      render: (s) => s.role?.toLowerCase() === 'organizer'
        ? <span className="text-ink-700 text-xs">—</span>
        : <GradeBadge gradeObj={getGrade(s.score, effectiveMaxScore, gradeThresholds)} />,
    },
    {
      id: 'score', label: 'Score', align: 'right',
      render: (s) => {
        if (s.role?.toLowerCase() === 'organizer')
          return <span className="text-ink-700 text-xs">—</span>;
        const color = getScoreColor(s.score, effectiveMaxScore, highScoreThreshold, midScoreThreshold);
        return (
          <span className="text-sm font-bold font-mono" style={{ color }}>
            {s.score.toFixed(1)}<span className="text-ink-600 font-normal">/{effectiveMaxScore}</span>
          </span>
        );
      },
    },
  ].filter(col => visibleColumns[col.id] !== false);

  const filteredStudents = students
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.id || '').includes(search))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'absent') return b.absent - a.absent;
      if (sortBy === 'role') return (a.role || '').localeCompare(b.role || '');
      return b.score - a.score;
    });

  const totalPages = rowsPerPage > 0 ? Math.ceil(filteredStudents.length / rowsPerPage) : 1;
  const pagedStudents = rowsPerPage > 0
    ? filteredStudents.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
    : filteredStudents;

  // Calculate distribution based on all attendance records across all students
  let totalOnTime = 0;
  let totalLate = 0;
  let totalAbsent = 0;

  for (const student of students) {
    totalOnTime += student.normal;
    totalLate += student.late;
    totalAbsent += student.absent;
  }

  // Effective max score scales with the number of sessions (files)
  const effectiveMaxScore = config.maxScore * (numSessions || 1);

  const pieData = [
    { name: 'On-Time', value: totalOnTime },
    { name: 'Late',    value: totalLate },
    { name: 'Absent',  value: totalAbsent },
  ].filter(d => d.value > 0);

  // Histogram data - Attendance distribution
  const histogramData = [
    { name: 'On-Time', Students: totalOnTime, fill: '#008080' },
    { name: 'Late', Students: totalLate, fill: '#ff7722' },
    { name: 'Absent', Students: totalAbsent, fill: '#9B1C31' },
  ].filter(d => d.Students > 0);

  const getExportStudents = () => anonymizeExports ? anonymizeStudents(students) : students;

  const avgScore = students.length
    ? students.reduce((s, x) => s + x.score, 0) / students.length
    : 0;

  const hasGoBack = originalConfig !== null && committedConfig !== null && students.length > 0 &&
    JSON.stringify(committedConfig) !== JSON.stringify(originalConfig);

  const hasConfigChanges = committedConfig !== null && students.length > 0 && (
    config.classStart !== committedConfig.classStart ||
    config.classEnd !== committedConfig.classEnd ||
    config.lateThreshold !== committedConfig.lateThreshold ||
    config.absentThreshold !== committedConfig.absentThreshold ||
    config.maxScore !== committedConfig.maxScore ||
    config.latePenalty !== committedConfig.latePenalty ||
    config.absentPenalty !== committedConfig.absentPenalty
  );

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="flex h-full">
        {/* Mobile backdrop */}
        {activeTab === 'edit' && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setActiveTab('dashboard')}
          />
        )}

        {/* Sidebar - Configuration Panel - Toggle with activeTab */}
        <aside className={`
          border-r border-ink-800 flex flex-col bg-ink-950 overflow-y-auto flex-shrink-0 transition-all duration-500
          fixed top-14 bottom-0 left-0 z-40 rounded-tr-2xl rounded-br-2xl
          md:relative md:top-auto md:bottom-auto md:z-auto md:rounded-none
          ${activeTab === 'edit'
            ? 'w-72 opacity-100 translate-x-0'
            : 'w-72 opacity-0 -translate-x-full md:w-0 md:opacity-0'}
        `} style={{transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
          <div className="p-5 border-b border-ink-800 animate-in fade-in slide-in-from-left duration-700" style={{animationDelay: '80ms'}}>
            <h2 className="text-sm font-semibold text-ink-100 mb-0.5" style={{ fontFamily: 'Syne' }}>Configuration</h2>
            <p className="text-xs text-ink-500">Rules & scoring parameters</p>
          </div>
          <div className="p-5 flex-1 animate-in fade-in duration-700" style={{animationDelay: '120ms'}}>
            <ConfigPanel
              hasChanges={hasConfigChanges}
              onApply={handleAnalyze}
              onCancel={() => setConfig({ ...committedConfig })}
              hasGoBack={hasGoBack}
              onGoBack={handleGoBack}
            />
          </div>
        </aside>

        {/* Main */}
        <main className={`flex-1 overflow-y-auto transition-all duration-700 ${
          animateIn ? 'opacity-100 scale-100 translate-y-0 appstore-drop' : 'opacity-0 scale-95 translate-y-10'
        }`} style={{transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'}}>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full">

          {/* Upload */}
          <div className="animate-in fade-in zoom-in duration-700" style={{animationDelay: '160ms'}}>
            <h1 className="text-2xl font-bold text-ink-100 mb-1" style={{ fontFamily: 'Syne' }}>
              Upload Attendance Files
            </h1>
            <p className="text-ink-500 text-sm mb-4">Microsoft Teams attendance reports (.xlsx, .xls, .xlsm, .csv, .pdf, .docx)</p>

            <div {...getRootProps()} className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
              ${isDragActive ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-ink-700 hover:border-ink-500 hover:bg-ink-800/30'}
            `}>
              <input {...getInputProps()} />
              <Upload className={`mx-auto mb-3 ${isDragActive ? 'text-accent' : 'text-ink-600'}`} size={28} />
              <p className="text-ink-300 text-sm font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
              </p>
              <p className="text-ink-600 text-xs mt-1">Supports .xlsx, .xls, .xlsm, .csv, .pdf, .docx — multiple files OK</p>
            </div>

            {parsedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {/* Selection buttons */}
                <div className="flex gap-2 mb-2">
                  <button onClick={selectAllFiles} 
                    className="text-xs px-2 py-1 rounded bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors">
                    Select All
                  </button>
                  <button onClick={deselectAllFiles}
                    className="text-xs px-2 py-1 rounded bg-ink-700 border border-ink-600 text-ink-300 hover:bg-ink-600 transition-colors">
                    Deselect All
                  </button>
                  <span className="text-xs text-ink-500 ml-auto pt-1">
                    {selectedFileNames.length} of {parsedFiles.length} selected
                  </span>
                </div>
                
                {/* File list with checkboxes */}
                <div ref={fileListRef} className="space-y-2">
                {parsedFiles.map((f) => {
                  const isSelected = selectedFileNames.includes(f.filename);
                  return (
                    <div key={f.filename} data-stagger
                      className="flex items-center gap-3 bg-ink-800/50 rounded-lg px-3 py-2 hover:bg-ink-800/70 transition-colors"
                      style={{ willChange: 'transform, opacity' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFileSelection(f.filename)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <FileSpreadsheet size={14} className="text-accent flex-shrink-0" />
                      <span className="text-sm text-ink-200 flex-1 truncate">{f.filename}</span>
                      <span className="text-xs text-ink-500">{f.records.length} rows</span>
                      <button onClick={() => removeFile(f.filename)} className="text-ink-600 hover:text-danger transition-colors ml-1">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                </div>{/* /fileListRef */}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={handleAnalyze} disabled={isAnalyzing || !selectedFileNames.length}
                className="mirror-btn-primary flex items-center gap-2 px-5 py-2.5 font-semibold text-sm">
                {isAnalyzing
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Play size={14} />}
                Analyze Attendance
              </button>
              {(parsedFiles.length > 0 || students.length > 0) && (
                <button onClick={handleClear} className="mirror-btn flex items-center gap-2 px-4 py-2 text-sm text-ink-400 hover:text-ink-200">
                  <RotateCcw size={14} />Clear All
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {students.length > 0 && (
            <>
              {/* Header with Edit button - Sticky */}
              <div className="sticky top-0 z-40 backdrop-blur-lg flex items-center justify-between mb-4 p-4 -mx-4 px-4 rounded-lg border-b border-ink-800" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <h2 className="text-2xl font-bold text-ink-100" style={{ fontFamily: 'Syne' }}>Results</h2>
                  <p className="text-xs text-ink-500 mt-1">Analysis summary and student details</p>
                </div>
                <button
                  onClick={() => setActiveTab(activeTab === 'edit' ? 'dashboard' : 'edit')}
                  className="mirror-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-300 hover:scale-105 text-white flex-shrink-0"
                >
                  <Sliders size={14} />
                  {activeTab === 'edit' ? 'Hide' : 'Edit'}
                </button>
              </div>

              {/* Persisted results banner */}
              {resultsRestoredAt && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink-800/60 border border-ink-700 text-xs text-ink-400 animate-in fade-in zoom-in duration-700" style={{animationDelay: '200ms'}}>
                  <Info size={13} className="flex-shrink-0 text-accent" />
                  <span>Showing results saved {new Date(resultsRestoredAt).toLocaleString()} — upload files and re-analyze to refresh.</span>
                  <button onClick={clearPersistedOnly} className="ml-auto text-ink-600 hover:text-ink-300 transition-colors flex-shrink-0">Dismiss</button>
                </div>
              )}
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students',  value: students.length, hint: 'Unique individuals', color: 'text-ink-300' },
                  { label: 'Sessions',  value: numSessions, hint: 'Files analyzed', color: 'text-ink-300' },
                  { label: 'Avg Score', value: avgScore.toFixed(1), hint: '', color: getScoreColor(avgScore, effectiveMaxScore, highScoreThreshold, midScoreThreshold) },
                  { label: 'At Risk', value: students.filter(s => (s.score / effectiveMaxScore) * 100 < atRiskThreshold).length, hint: '', color: '#ef4565' },
                ].map((stat, i) => (
                  <StatCard key={stat.label} stat={stat} index={i} />
                ))}
              </div>

              {/* Chart + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardWithHover animDelay={320}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-ink-300" style={{ fontFamily: 'Syne' }}>
                      DISTRIBUTION
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChartType('histogram')}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                          chartType === 'histogram'
                            ? 'bg-accent/20 border border-accent/50 text-accent chart-btn-active'
                            : 'border border-ink-700 text-ink-500 hover:border-ink-600 hover:text-ink-400'
                        }`}
                      >
                        Histogram
                      </button>
                      <button
                        onClick={() => setChartType('pie')}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                          chartType === 'pie'
                            ? 'bg-accent/20 border border-accent/50 text-accent chart-btn-active'
                            : 'border border-ink-700 text-ink-500 hover:border-ink-600 hover:text-ink-400'
                        }`}
                      >
                        Pie Chart
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      {chartType === 'histogram' ? (
                        <BarChart data={histogramData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                          <XAxis dataKey="name" stroke="#5f6c7b" style={{ fontSize: 11 }} />
                          <YAxis stroke="#5f6c7b" style={{ fontSize: 11 }} />
                          <Tooltip 
                            contentStyle={{ background: '#fffffe', border: '1px solid #90b4ce', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#094067' }}
                            formatter={(value) => [`${value}`, 'Count']}
                          />
                          <Bar dataKey="Students" radius={[8, 8, 0, 0]}>
                            {histogramData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                            dataKey="value" paddingAngle={2}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#fffffe', border: '1px solid #90b4ce', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#094067' }} />
                          <Legend iconType="circle" iconSize={6}
                            formatter={(v) => <span style={{ fontSize: 11, color: '#5f6c7b' }}>{v}</span>} />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardWithHover>

                <div className="md:col-span-2 grid grid-rows-3 gap-3">
                  {[
                    { label: 'On-Time',  value: totalOnTime, pct: totalOnTime / (totalOnTime + totalLate + totalAbsent) * 100, color: '#008080' },
                    { label: 'Late',     value: totalLate,   pct: totalLate   / (totalOnTime + totalLate + totalAbsent) * 100, color: '#ff7722' },
                    { label: 'Absent',   value: totalAbsent, pct: totalAbsent / (totalOnTime + totalLate + totalAbsent) * 100, color: '#9B1C31' },
                  ].map((item, idx) => (
                    <CardWithHover key={item.label} animDelay={340 + idx * 60}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-ink-400 transition-all group-hover:text-ink-200">{item.label}</span>
                          <span className="text-sm font-bold text-ink-200 transition-all group-hover:text-accent">{item.value}</span>
                        </div>
                        <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${item.pct || 0}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                      <span className="text-sm font-mono text-ink-500 transition-all group-hover:text-ink-400">{(item.pct || 0).toFixed(0)}%</span>
                    </div>
                    </CardWithHover>
                  ))}
                </div>
              </div>

              {/* ── Student Table ─────────────────────────────────────────── */}
              <div className="card animate-in fade-in zoom-in duration-700 group card-hover" style={{ animationDelay: '520ms' }}>
                {/* Table toolbar */}
                <div className="p-4 border-b border-ink-800 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-ink-500" />
                    <span className="text-xs text-ink-500" style={{ fontFamily: 'Syne' }}>
                      {filteredStudents.length} STUDENTS
                    </span>
                  </div>
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <input className="input w-full pr-9" placeholder="Search name or ID…"
                      value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
                    {search && (
                      <button
                        onClick={() => { setSearch(''); setPage(0); }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors duration-200"
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-xs text-ink-500">Sort:</label>
                    <select className="input text-sm py-2 w-auto" value={sortBy}
                      onChange={e => { setSortBy(e.target.value); setPage(0); }}>
                      <option value="score">Score</option>
                      <option value="name">Name</option>
                      <option value="role">Role</option>
                      <option value="absent">Most Absent</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto py-1">
                  <table className="w-full border-separate [border-spacing:0]">
                    <thead>
                      <tr className="border-b-2 border-accent bg-white">
                        {colDefs.map((col, i) => (
                          <th key={col.id}
                            className={`py-4 px-4 text-xs font-bold text-accent whitespace-nowrap tracking-wider
                              ${i === 0 ? 'pl-5 text-left' : i === colDefs.length - 1 ? 'pr-5' : ''}
                              ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                              ${i < colDefs.length - 1 ? 'border-r border-accent/20' : ''}
                            `}
                            style={{ fontFamily: 'Syne', letterSpacing: '0.1em' }}>
                            {col.label.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStudents.map((s, idx) => (
                        <StudentRow
                          key={s.name}
                          student={s}
                          isSelected={selectedStudent?.name === s.name}
                          onSelect={handleSelectStudent}
                          colDefs={colDefs}
                          rowIndex={idx}
                        />
                      ))}
                    </tbody>
                  </table>
                  {filteredStudents.length === 0 && (
                    <div className="py-12 text-center text-ink-600 text-sm">No students match your search</div>
                  )}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-ink-800 bg-ink-900/60">
                      <span className="text-xs text-ink-500 font-medium">
                        {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredStudents.length)} of {filteredStudents.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(p => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-3 py-1.5 text-xs font-semibold rounded border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`w-8 h-8 text-xs font-bold rounded border transition-all ${
                              i === page
                                ? 'border-accent bg-accent/20 text-accent shadow-lg shadow-accent/20'
                                : 'border-ink-700 text-ink-400 hover:border-accent/50 hover:text-accent hover:bg-accent/5'
                            }`}
                          >{i + 1}</button>
                        ))}
                        <button
                          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={page === totalPages - 1}
                          className="px-3 py-1.5 text-xs font-semibold rounded border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >Next</button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="p-3 border-t border-ink-800 text-xs text-ink-600 text-center">
                    Click a row to view individual detail · click the selected row again to deselect
                  </div>
                )}
              </div>

              {/* ── Individual Section ────────────────────────────────────── */}
              {selectedStudent && (
                <IndividualSection
                  student={selectedStudent}
                  maxScore={effectiveMaxScore}
                  onClose={() => setSelectedStudent(null)}
                />
              )}

              {/* Export */}
              <div className="card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <h3 className="text-sm font-semibold text-ink-300 mb-4" style={{ fontFamily: 'Syne' }}>EXPORT REPORT</h3>
                
                <div className="flex items-center gap-3">
                  {[
                    { key: 'csv', label: 'CSV', icon: Download },
                    { key: 'txt', label: 'TXT', icon: FileText },
                    { key: 'pdf', label: 'PDF', icon: Printer  },
                  ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setExportFormat(key)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-all duration-300 transform hover:scale-105 ${
                        exportFormat === key
                          ? 'mirror-btn text-accent font-semibold scale-110 shadow-lg shadow-accent/40'
                          : 'mirror-btn text-ink-400 hover:text-ink-200'
                      }`}>
                      <Icon size={14} />{label}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-ink-700 mx-1" />
                  <button
                    onClick={() => {
                      if (exportFormat === 'csv') exportCSV(getExportStudents());
                      else if (exportFormat === 'txt') exportTXT(getExportStudents(), config, numSessions);
                      else exportPDF(getExportStudents(), config, numSessions);
                    }}
                    className="mirror-btn-primary flex items-center gap-2 px-4 py-1.5 text-sm font-semibold">
                    <Download size={14} />Download
                  </button>
                </div>
              </div>
            </>
          )}

          {students.length === 0 && parsedFiles.length === 0 && (
            <div className="text-center py-20 text-ink-700">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium" style={{ fontFamily: 'Syne' }}>No data yet</p>
              <p className="text-sm mt-1">Upload Excel files to get started</p>
            </div>
          )}
        </div>
      </main>
      </div>
    </>
  );
}
