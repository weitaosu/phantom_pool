'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Market {
  conditionId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  source: string;
}

interface ArbitrageOpp {
  market: string;
  polymarketPrice: number;
  geminiPrice: number;
  spread: number;
  direction: string;
}

interface NewsSignal {
  articleTitle: string;
  affectedMarket: string;
  edge: number;
  confidence: number;
  action: string;
  timestamp: number;
}

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [geminiMarkets, setGeminiMarkets] = useState<Market[]>([]);
  const [arbs, setArbs] = useState<ArbitrageOpp[]>([]);
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [health, setHealth] = useState<{ status: string; orderBookSize: number } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [mRes, gRes, aRes, sRes, hRes] = await Promise.allSettled([
          fetch(`${API}/api/markets`),
          fetch(`${API}/api/gemini/events`),
          fetch(`${API}/api/gemini/cross-venue`),
          fetch(`${API}/api/news/signals`),
          fetch(`${API}/health`),
        ]);
        if (mRes.status === 'fulfilled' && mRes.value.ok) setMarkets(await mRes.value.json());
        if (gRes.status === 'fulfilled' && gRes.value.ok) setGeminiMarkets(await gRes.value.json());
        if (aRes.status === 'fulfilled' && aRes.value.ok) setArbs(await aRes.value.json());
        if (sRes.status === 'fulfilled' && sRes.value.ok) setSignals(await sRes.value.json());
        if (hRes.status === 'fulfilled' && hRes.value.ok) setHealth(await hRes.value.json());
      } catch { /* backend may be offline */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid #222', paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DarkPool.trade
          </h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Privacy-preserving prediction market trading</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: health?.status === 'ok' ? '#1a3a1a' : '#3a1a1a', color: health?.status === 'ok' ? '#4ade80' : '#f87171' }}>
            {health?.status === 'ok' ? `Online — ${health.orderBookSize} orders` : 'Offline'}
          </span>
          <a href="/trade" style={{ padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Trade Now
          </a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Markets Panel */}
        <Panel title="Polymarket Markets" subtitle={`${markets.length} active`}>
          {markets.slice(0, 6).map(m => (
            <MarketRow key={m.conditionId} title={m.title} yes={m.yesPrice} volume={m.volume24h} source="Polymarket" />
          ))}
        </Panel>

        {/* Gemini Markets Panel */}
        <Panel title="Gemini Markets" subtitle="Cross-venue data">
          {geminiMarkets.length > 0 ? geminiMarkets.slice(0, 6).map(m => (
            <MarketRow key={m.conditionId} title={m.title} yes={m.yesPrice} volume={m.volume24h} source="Gemini" />
          )) : <p style={{ color: '#666', fontSize: 13 }}>Loading Gemini data...</p>}
        </Panel>

        {/* Arbitrage Panel */}
        <Panel title="Cross-Venue Arbitrage" subtitle="Gemini vs Polymarket">
          {arbs.length > 0 ? arbs.map((a, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a2e', fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>{a.market}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginTop: 4 }}>
                <span>Poly: {(a.polymarketPrice * 100).toFixed(0)}¢</span>
                <span>Gemini: {(a.geminiPrice * 100).toFixed(0)}¢</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Spread: {(a.spread * 100).toFixed(1)}¢</span>
              </div>
            </div>
          )) : <p style={{ color: '#666', fontSize: 13 }}>No arbitrage opportunities detected</p>}
        </Panel>

        {/* News Agent Panel */}
        <Panel title="Agent Activity" subtitle="News-driven signals">
          {signals.length > 0 ? signals.slice(-5).reverse().map((s, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a2e', fontSize: 13 }}>
              <div style={{ fontWeight: 500 }}>{s.articleTitle.slice(0, 60)}</div>
              <div style={{ display: 'flex', gap: 12, color: '#888', marginTop: 4 }}>
                <span style={{ color: s.action === 'BUY_YES' ? '#4ade80' : '#f87171' }}>{s.action}</span>
                <span>Edge: {(s.edge * 100).toFixed(1)}%</span>
                <span>Conf: {s.confidence}</span>
              </div>
            </div>
          )) : <p style={{ color: '#666', fontSize: 13 }}>Agent starting... signals will appear here</p>}
        </Panel>
      </div>

      {/* Bounty Coverage Footer */}
      <footer style={{ marginTop: 40, padding: 20, background: '#111118', borderRadius: 12, fontSize: 13 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#8b5cf6' }}>Bounty Coverage</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Polymarket', 'Arkhai', 'Solana Markets', 'Solana x402', 'TRON DeFi', 'TRON AI', 'Gemini', 'Filecoin'].map(b => (
            <span key={b} style={{ padding: '4px 10px', borderRadius: 6, background: '#1a1a2e', color: '#a78bfa', fontSize: 12 }}>{b}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111118', borderRadius: 12, padding: 20, border: '1px solid #1a1a2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
        <span style={{ fontSize: 12, color: '#666' }}>{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function MarketRow({ title, yes, volume, source }: { title: string; yes: number; volume: number; source: string }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ fontWeight: 500 }}>{title.slice(0, 50)}{title.length > 50 ? '...' : ''}</div>
        <span style={{ color: '#666', fontSize: 11 }}>{source} | ${(volume / 1e6).toFixed(1)}M vol</span>
      </div>
      <div style={{ textAlign: 'right', minWidth: 60 }}>
        <div style={{ color: '#4ade80', fontWeight: 600 }}>{Math.round(yes * 100)}¢</div>
        <div style={{ color: '#666', fontSize: 11 }}>YES</div>
      </div>
    </div>
  );
}
