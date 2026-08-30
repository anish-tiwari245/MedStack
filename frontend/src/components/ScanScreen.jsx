import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function ScanScreen({ onAdd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | live | reading | error
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState('');
  const [mDose, setMDose] = useState('');

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('live');
    } catch {
      setStatus('error');
      setError('Camera unavailable. You can enter a medication manually.');
      setManual(true);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function capture() {
    const video = videoRef.current;
    if (!video) return;
    setStatus('reading');
    const canvas = document.createElement('canvas');
    const srcW = video.videoWidth || 1080;
    const srcH = video.videoHeight || 1440;
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    try {
      const result = await api.scan(dataUrl, 'image/jpeg');
      stopCamera();
      onAdd({ name: result.drug, dosage: result.dosage, frequency: result.frequency, brand: result.brand });
    } catch (err) {
      setStatus('live');
      setError(err.message + ' — try again or enter manually.');
    }
  }

  function addManual() {
    if (!mName.trim()) return;
    stopCamera();
    onAdd({ name: mName.trim().toLowerCase(), dosage: mDose.trim() || null });
    setMName(''); setMDose('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingTop: 8, gap: 6 }}>
      <p className="eyebrow" style={{ flexShrink: 0 }}>Add a medication</p>

      {!manual && (
        <div className="card" style={{ overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#12201c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'live' || status === 'reading' ? 'block' : 'none' }} />

            {status === 'idle' && (
              <div style={{ textAlign: 'center', color: '#cfe0da', padding: 24 }}>
                <CamIcon />
                <p style={{ fontSize: 14, marginTop: 12, color: '#a7bdb6' }}>Point at a pill bottle label</p>
              </div>
            )}

            {(status === 'live' || status === 'reading') && <Frame reading={status === 'reading'} />}
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {status === 'idle' && (
              <button className="btn-primary" onClick={startCamera}><CamIcon small /> Open camera</button>
            )}
            {status === 'live' && (
              <button className="btn-primary" onClick={capture}><CamIcon small /> Scan label</button>
            )}
            {status === 'reading' && (
              <button className="btn-primary" disabled>Reading label…</button>
            )}
            <button className="btn-ghost" onClick={() => { stopCamera(); setManual(true); }}>Enter manually instead</button>
          </div>
        </div>
      )}

      {manual && (
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <div>
            <label className="eyebrow">Medication name</label>
            <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. warfarin"
              style={inp} />
          </div>
          <div>
            <label className="eyebrow">Dosage (optional)</label>
            <input value={mDose} onChange={(e) => setMDose(e.target.value)} placeholder="e.g. 5 mg"
              style={inp} />
          </div>
          <button className="btn-primary" onClick={addManual}>Add to stack</button>
          <button className="btn-ghost" onClick={() => { setManual(false); setStatus('idle'); }}>Use camera instead</button>
        </div>
      )}

      {error && <p style={{ color: 'var(--red-ink)', fontSize: 12.5, lineHeight: 1.4, flexShrink: 0 }}>{error}</p>}
    </div>
  );
}

const inp = {
  width: '100%', marginTop: 6, padding: '11px 13px', fontSize: 15,
  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', color: 'var(--ink)',
};

function Frame({ reading }) {
  const c = reading ? '#7fd1bd' : '#bfe0d7';
  const C = (s) => ({ position: 'absolute', width: 26, height: 26, ...s });
  return (
    <>
      <div style={C({ top: 18, left: 18, borderLeft: `2px solid ${c}`, borderTop: `2px solid ${c}` })} />
      <div style={C({ top: 18, right: 18, borderRight: `2px solid ${c}`, borderTop: `2px solid ${c}` })} />
      <div style={C({ bottom: 18, left: 18, borderLeft: `2px solid ${c}`, borderBottom: `2px solid ${c}` })} />
      <div style={C({ bottom: 18, right: 18, borderRight: `2px solid ${c}`, borderBottom: `2px solid ${c}` })} />
      {reading && (
        <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: c }}>
          Reading label…
        </div>
      )}
    </>
  );
}

function CamIcon({ small }) {
  const s = small ? 18 : 46;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
      <path d="M14.5 4l1.5 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4L9.5 4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
