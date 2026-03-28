'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Order {
  orderId: string;
  market: string;
  isYes: boolean;
  sizeUsdc: string;
  limitPriceBps: number;
  state: string;
  chain: string;
}

interface ReputationReport {
  agentId: string | null;
  accuracy: number;
  totalTrades: number;
  correctPredictions: number;
  cids: string[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reputation, setReputation] = useState<ReputationReport | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oRes, rRes] = await Promise.allSettled([
          fetch(`${API}/api/orders`),
          fetch(`${API}/api/agent/reputation`),
        ]);
        if (oRes.status === 'fulfilled' && oRes.value.ok) setOrders(await oRes.value.json());
        if (rRes.status === 'fulfilled' && rRes.value.ok) setReputation(await rRes.value.json());
      } catch { /* offline */ }
    };
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, []);

  const stateColor: Record<string, string> = {
    COMMITTED: '#f59e0b', REVEALED: '#3b82f6', MATCHED: '#4ade80',
    SETTLED: '#22c55e', ICEBERG: '#a78bfa', CANCELLED: '#ef4444', COMPLETED: '#22c55e',
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
      <a href="/" style={{ color: '#8b5cf6', textDecoration: 'none', fontSize: 14 }}>&larr; Dashboard</a>
      <h1 style={{ fontSize: 24, margin: '16px 0 32px' }}>Order Book & Agent Status</h1>

      {/* Orders Table */}
      <div style={{ background: '#111118', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #1a1a2e' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>Active Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p style={{ color: '#666', fontSize: 13 }}>No orders yet. Submit one via the trade page or Telegram bot.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #222' }}>
                <th style={{ padding: 8 }}>Order ID</th>
                <th style={{ padding: 8 }}>Side</th>
                <th style={{ padding: 8 }}>Size</th>
                <th style={{ padding: 8 }}>Price</th>
                <th style={{ padding: 8 }}>Chain</th>
                <th style={{ padding: 8 }}>State</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.orderId} style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{o.orderId.slice(0, 16)}...</td>
                  <td style={{ padding: 8, color: o.isYes ? '#4ade80' : '#f87171', fontWeight: 600 }}>{o.isYes ? 'YES' : 'NO'}</td>
                  <td style={{ padding: 8 }}>${(parseInt(o.sizeUsdc) / 1e6).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{(o.limitPriceBps / 100).toFixed(0)}¢</td>
                  <td style={{ padding: 8 }}>{o.chain}</td>
                  <td style={{ padding: 8 }}><span style={{ color: stateColor[o.state] ?? '#888', fontWeight: 500 }}>{o.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Agent Reputation (Filecoin) */}
      <div style={{ background: '#111118', borderRadius: 12, padding: 20, border: '1px solid #1a1a2e' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>Agent Reputation (Filecoin-backed)</h2>
        {reputation ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Accuracy" value={`${(reputation.accuracy * 100).toFixed(0)}%`} />
            <StatCard label="Total Trades" value={reputation.totalTrades.toString()} />
            <StatCard label="Correct" value={reputation.correctPredictions.toString()} />
            <StatCard label="Stored CIDs" value={reputation.cids.length.toString()} />
          </div>
        ) : (
          <p style={{ color: '#666', fontSize: 13 }}>Loading reputation data...</p>
        )}
        {reputation?.agentId && (
          <p style={{ color: '#666', fontSize: 11, marginTop: 12, fontFamily: 'monospace' }}>
            Agent ID: ipfs://{reputation.agentId.slice(0, 30)}...
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#1a1a2e', padding: 16, borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}
