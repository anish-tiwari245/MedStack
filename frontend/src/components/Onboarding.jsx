// First-run click-through tour: spotlights each tab button in turn, then
// recaps the red/yellow/green legend over the live (seeded) map before
// handing control back to App, which clears the seed data.

export const STEPS = [
  { target: null, tab: 'stack', title: 'Welcome to MedStack', body: "Point your phone at a pill bottle and we'll map how your medications interact. Quick tour first." },
  { target: 'scan', tab: 'scan', title: 'Scan', body: "Add a medication by photographing its label — or enter it manually if the camera isn't available." },
  { target: 'stack', tab: 'stack', title: 'Stack', body: 'Every medication you’ve added, color-coded by its most serious known interaction.' },
  { target: 'map', tab: 'map', title: 'Map', body: 'Tap any line between two medications for a plain-English explanation of the risk.' },
  { target: null, tab: 'map', legend: true, title: 'Reading the safety map', body: 'This example stack shows all three. Each line is color-coded:' },
];

export default function Onboarding({ step, targetRects, appHeight, onNext, onSkip, onFinish }) {
  const s = STEPS[step];
  const rect = s.target ? targetRects[s.target] : null;
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      {rect ? (
        <div style={{
          position: 'absolute',
          left: rect.left - 6, top: rect.top - 6,
          width: rect.width + 12, height: rect.height + 12,
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(10, 18, 16, 0.72)',
          border: '2px solid var(--teal)',
          pointerEvents: 'none',
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 18, 16, 0.72)' }} />
      )}

      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          ...(rect ? { bottom: Math.max(20, appHeight - rect.top + 18) } : { top: '50%', transform: 'translateY(-50%)' }),
        }}
      >
        <div className="card" style={{ padding: 20, background: '#fff', position: 'relative' }}>
          <p className="eyebrow" style={{ color: 'var(--teal)', marginBottom: 6 }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 8 }}>{s.title}</p>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: s.legend ? 12 : 18 }}>
            {s.body}
          </p>

          {s.legend && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <LegendRow color="var(--red)" label="Red" desc="Dangerous — avoid or needs medical supervision" />
              <LegendRow color="var(--amber)" label="Yellow" desc="Use caution, monitor" />
              <LegendRow color="var(--green)" label="Green" desc="No known interaction" />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {!isLast && (
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onSkip}>Skip</button>
            )}
            <button className="btn-primary" style={{ flex: 1 }} onClick={isLast ? onFinish : onNext}>
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5 }}>
        <strong>{label}</strong> — <span style={{ color: 'var(--ink-soft)' }}>{desc}</span>
      </span>
    </div>
  );
}
