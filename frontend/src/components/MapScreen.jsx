import { useState } from 'react';
import SafetyGraph from './SafetyGraph';
import { speak, stopSpeaking } from '../lib/speech';

const SEVMETA = {
  red: { label: 'Dangerous', cls: 'red', icon: '!' },
  yellow: { label: 'Use caution', cls: 'amber', icon: '!' },
  green: { label: 'No known issue', cls: 'green', icon: '✓' },
};
const DAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' }, { key: 'sun', label: 'Sun' },
];

export default function MapScreen({ drugs, pairs, loading }) {
  const [selected, setSelected] = useState(null);
  const [dayFilter, setDayFilter] = useState(null); // null = show everything, groups are optional

  const hasGroups = drugs.some((d) => d.days?.length);

  // A drug with no days assigned is treated as "every day" and always shows,
  // whether or not the user is using groups at all.
  const viewDrugs = dayFilter ? drugs.filter((d) => !d.days?.length || d.days.includes(dayFilter)) : drugs;
  const viewNames = new Set(viewDrugs.map((d) => d.name.toLowerCase()));
  const viewPairs = dayFilter
    ? pairs.filter((p) => viewNames.has(p.drugA.toLowerCase()) && viewNames.has(p.drugB.toLowerCase()))
    : pairs;
  const viewSummary = viewPairs.reduce(
    (acc, p) => { acc[p.severity] = (acc[p.severity] || 0) + 1; return acc; },
    { red: 0, yellow: 0, green: 0 }
  );

  // auto-surface the most serious pair as the default detail
  const hottest = [...viewPairs].sort((a, b) => rank(b.severity) - rank(a.severity))[0];
  const active = selected || hottest;
  const activeKey = active ? [active.drugA, active.drugB].sort().join('|') : null;
  // Nodes only pick up color once the user has actually tapped a line —
  // the auto-surfaced "hottest pair" default should not tint any circle.
  const tappedKey = selected ? activeKey : null;

  const dayGroups = (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 10 }}>
      <DayChip active={!dayFilter} onClick={() => setDayFilter(null)}>All</DayChip>
      {DAYS.map((d) => (
        <DayChip key={d.key} active={dayFilter === d.key} onClick={() => setDayFilter(d.key)}>{d.label}</DayChip>
      ))}
    </div>
  );

  if (drugs.length < 2) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Add at least two medications</p>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 8 }}>
          The safety map draws a line the moment two drugs could interact.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {hasGroups && dayGroups}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p className="eyebrow">Safety map{dayFilter ? ` · ${DAYS.find((d) => d.key === dayFilter)?.label}` : ''}</p>
        <div className="chips">
          {viewSummary.red > 0 && <span className="chip chip--red"><span className="chip__dot" />{viewSummary.red} red</span>}
          {viewSummary.yellow > 0 && <span className="chip chip--amber"><span className="chip__dot" />{viewSummary.yellow}</span>}
          {viewSummary.green > 0 && <span className="chip chip--green"><span className="chip__dot" />{viewSummary.green}</span>}
        </div>
      </div>

      {viewDrugs.length < 2 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)' }}>No medications grouped into this day yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 6, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
              Checking live interactions…
            </div>
          )}
          <SafetyGraph drugs={viewDrugs} pairs={viewPairs} highlightKey={activeKey} tappedKey={tappedKey}
            onSelectPair={(p) => { stopSpeaking(); setSelected(p); }} />
          <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-faint)', paddingBottom: 8 }}>
            Tap any colored line for details
          </p>
        </div>
      )}

      {active && viewDrugs.length >= 2 && <DetailCard pair={active} />}
    </div>
  );
}

function DetailCard({ pair }) {
  const meta = SEVMETA[pair.severity] || SEVMETA.green;
  const [spoken, setSpoken] = useState(false);
  const line = `${pair.drugA} and ${pair.drugB}. ${pair.summary} ${pair.action}`;

  function toggleSpeak() {
    if (spoken) { stopSpeaking(); setSpoken(false); }
    else { speak(line); setSpoken(true); }
  }

  return (
    <div className={`card`} style={{ marginTop: 14, padding: 18, borderTop: `3px solid var(--${meta.cls})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className={`chip chip--${meta.cls}`}><span className="chip__dot" />{meta.label}</span>
        {pair.source === 'live' && (
          <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>● LIVE DATA</span>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, textTransform: 'capitalize', marginBottom: 8 }}>
        {pair.drugA} + {pair.drugB}
      </p>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 10 }}>{pair.summary}</p>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>What to do: </strong>{pair.action}
      </p>
      <button className="btn-ghost" onClick={toggleSpeak} style={{ width: '100%' }}>
        <SpeakerIcon /> {spoken ? 'Stop' : 'Read this aloud'}
      </button>
      {pair.sourceUrl && (
        <a href={pair.sourceUrl} target="_blank" rel="noreferrer"
          style={{ display: 'block', textAlign: 'center', fontSize: 11.5, color: 'var(--teal)', marginTop: 10, textDecoration: 'none' }}>
          Source
        </a>
      )}
    </div>
  );
}

function rank(s) { return { green: 0, yellow: 1, red: 2 }[s] ?? 0; }

function DayChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      border: `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
      background: active ? 'var(--teal)' : 'var(--surface)',
      color: active ? '#fff' : 'var(--ink-soft)',
    }}>
      {children}
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" />
    </svg>
  );
}
