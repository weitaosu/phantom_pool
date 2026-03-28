'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function TradePage() {
  const [step, setStep] = useState(1);
  const [market, setMarket] = useState('');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [size, setSize] = useState('1000');
  const [limit, setLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; state: string } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/orders/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitHash: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
          traderAddress: 'web-demo-user',
          chain: 'polygon',
          market,
          isYes: side === 'yes',
          sizeUsdc: (parseInt(size) * 1_000_000).toString(),
          limitPriceBps: limit ? parseInt(limit) * 100 : 6500,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 600,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { orderId: string; state: string };
        setResult(data);
        setStep(4);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <a href="/" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: 14 }}>&larr; Back to Dashboard</a>
      <h1 style={{ fontSize: 24, margin: '16px 0 8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Submit Dark Pool Order
      </h1>
      <p style={{ color: '#888', fontSize: 14, margin: '0 0 32px' }}>Your order is committed privately — no details visible on-chain.</p>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {['Market', 'Details', 'Review', 'Confirm'].map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: step > i ? '#6366f1' : '#1a1a2e', color: step > i ? 'white' : '#666' }}>
            {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>Market or search term</label>
          <input
            value={market}
            onChange={e => setMarket(e.target.value)}
            placeholder="e.g. Fed rate cut, BTC 100k, Trump 2028"
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
          />
          <button onClick={() => setStep(2)} disabled={!market} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: market ? '#6366f1' : '#333', color: 'white', border: 'none', cursor: market ? 'pointer' : 'default', fontSize: 14 }}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>Side</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['yes', 'no'] as const).map(s => (
                <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: 12, borderRadius: 8, border: side === s ? '2px solid #6366f1' : '1px solid #333', background: side === s ? '#1a1a3e' : '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>Size (USDC)</label>
            <input value={size} onChange={e => setSize(e.target.value)} type="number" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#ccc' }}>Limit price (cents, optional)</label>
            <input value={limit} onChange={e => setLimit(e.target.value)} type="number" placeholder="Auto" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 24px', borderRadius: 8, background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(3)} style={{ padding: '10px 24px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }}>Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Order Summary</h3>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <div><span style={{ color: '#888' }}>Market:</span> {market}</div>
            <div><span style={{ color: '#888' }}>Side:</span> <span style={{ color: side === 'yes' ? '#4ade80' : '#f87171', fontWeight: 600 }}>{side.toUpperCase()}</span></div>
            <div><span style={{ color: '#888' }}>Size:</span> ${parseInt(size).toLocaleString()} USDC</div>
            <div><span style={{ color: '#888' }}>Limit:</span> {limit ? `${limit}¢` : 'Auto'}</div>
          </div>
          <p style={{ color: '#a78bfa', fontSize: 13, margin: '16px 0 0' }}>Your order will be committed as a hash — no details visible on-chain until matching.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(2)} style={{ padding: '10px 24px', borderRadius: 8, background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Back</button>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 24px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {submitting ? 'Submitting...' : 'Commit Order'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div style={{ background: '#1a3a1a', padding: 20, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
          <h3 style={{ color: '#4ade80', margin: '0 0 8px' }}>Order Committed!</h3>
          <p style={{ color: '#888', fontSize: 13 }}>Order ID: <code style={{ color: '#e0e0e0' }}>{result.orderId}</code></p>
          <p style={{ color: '#888', fontSize: 13 }}>Status: {result.state}</p>
          <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>Searching for match... (up to 10 min)</p>
          <button onClick={() => { setStep(1); setResult(null); setMarket(''); }} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }}>
            New Order
          </button>
        </div>
      )}
    </div>
  );
}
