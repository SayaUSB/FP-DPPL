import { createContext, useContext, useState } from 'react';

const ICONS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  verify: 'M9 12l2 2 4-4m-3 9a9 9 0 100-18 9 9 0 000 18z',
  chart: 'M3 3v18h18M9 17V9m4 8V5m4 12v-6',
  status: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4',
  users: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 10-3-7',
  history: 'M3 3v5h5M3.05 13A9 9 0 106 5.3L3 8m9 1v4l3 2',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 8.5-8.5z',
  upload: 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M5 13l4 4L19 7',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5 10.1 11.9 4.5 10l5.6-1.4L12 3z',
  image: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
  bell: 'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  menu: 'M3 12h18M3 6h18M3 18h18',
  coins: 'M12 8c3.3 0 6-1.3 6-3s-2.7-3-6-3-6 1.3-6 3 2.7 3 6 3zM6 5v6c0 1.7 2.7 3 6 3s6-1.3 6-3V5M6 11v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

export function Icon({ name, className, style }) {
  return (
    <svg className={'ico ' + (className || '')} style={style} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] || ''} />
    </svg>
  );
}

export function Badge({ tone = 'gray', children, dot = true }) {
  return (
    <span className={'badge ' + tone}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = [
  'oklch(0.52 0.14 255)', 'oklch(0.50 0.10 220)', 'oklch(0.48 0.11 285)',
  'oklch(0.54 0.10 200)', 'oklch(0.50 0.12 265)', 'oklch(0.52 0.09 235)',
];

export function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export function initials(nama) {
  return (nama || '').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

export function Avatar({ nama, id, size = 36 }) {
  return (
    <div className="avatar" style={{ background: avatarColor(id || 0), width: size, height: size, fontSize: size * 0.36 }}>
      {initials(nama)}
    </div>
  );
}

// Mirrors server/src/scoring.js tingkatPrioritas() thresholds, presentation-only.
export function tingkatPrioritas(skor) {
  if (skor >= 70) return { label: 'Sangat Tinggi', tone: 'red' };
  if (skor >= 55) return { label: 'Tinggi', tone: 'amber' };
  if (skor >= 40) return { label: 'Sedang', tone: 'blue' };
  return { label: 'Rendah', tone: 'gray' };
}

export function ScoreChip({ skor }) {
  const t = tingkatPrioritas(skor);
  const toneColor = { red: 'var(--red)', amber: 'var(--amber)', blue: 'var(--blue-600)', gray: 'var(--faint)' }[t.tone];
  return (
    <div className="score" title={'Prioritas ' + t.label}>
      <div className="score-bar"><span style={{ width: skor + '%', background: toneColor }} /></div>
      <span className="score-val" style={{ color: toneColor }}>{skor}</span>
    </div>
  );
}

export function Donut({ segments, total, centerBig, centerSmall, size = 150 }) {
  const r = 56, c = 2 * Math.PI * r, stroke = 18;
  let offset = 0;
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="75" cy="75" r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--line)' }} />
        {segments.map((s, i) => {
          const frac = total ? s.value / total : 0;
          const dash = frac * c;
          const el = (
            <circle key={i} cx="75" cy="75" r={r} fill="none"
              strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset} strokeLinecap="butt"
              style={{ stroke: s.color, transition: 'stroke-dasharray .6s ease' }} />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="donut-center">
        <div className="big">{centerBig}</div>
        <div className="small">{centerSmall}</div>
      </div>
    </div>
  );
}

export function BarChart({ data, color = 'var(--blue-600)', fmt }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-val">{fmt ? fmt(d.value) : d.value}</div>
          <div className="bar" style={{ height: (d.value / max * 100) + '%', background: d.color || color }} />
          <div className="bar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function QuotaBar({ percent, over }) {
  return (
    <div className="quota-bar">
      <span style={{ width: Math.min(100, percent) + '%', background: over ? 'var(--red)' : 'var(--green)' }} />
    </div>
  );
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  function push(msg, tone = 'green') {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span className="t-ico" style={{ background: t.tone === 'green' ? 'var(--green)' : t.tone === 'red' ? 'var(--red)' : 'var(--blue-600)' }}>
              <Icon name={t.tone === 'green' ? 'check' : t.tone === 'red' ? 'alert' : 'bell'} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Card({ title, sub, icon, actions, children, className = '' }) {
  return (
    <div className={'card ' + className}>
      {(title || actions) && (
        <div className="card-head">
          {icon && <Icon name={icon} />}
          <div style={{ flex: 1 }}>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className="card-pad">{children}</div>
    </div>
  );
}
