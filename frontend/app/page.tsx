"use client";
import { useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";

interface Market {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  sentiment: "bull" | "bear" | "neut";
  source: "polymarket" | "gemini";
}

const MARKETS: Market[] = [
  { id:"pm1",  question:"Will BTC exceed $100k before April 2026?",           yesPrice:0.68, noPrice:0.32, volume:2400000, sentiment:"bull", source:"polymarket" },
  { id:"pm2",  question:"Will ETH ETF see net inflows this week?",             yesPrice:0.55, noPrice:0.45, volume:890000,  sentiment:"bull", source:"polymarket" },
  { id:"pm3",  question:"Will the Fed cut rates at March 2026 meeting?",       yesPrice:0.22, noPrice:0.78, volume:1200000, sentiment:"bear", source:"polymarket" },
  { id:"pm4",  question:"Will SOL reach $200 in Q1 2026?",                    yesPrice:0.41, noPrice:0.59, volume:650000,  sentiment:"neut", source:"polymarket" },
  { id:"pm5",  question:"Will Polymarket volume exceed $1B in March?",        yesPrice:0.73, noPrice:0.27, volume:430000,  sentiment:"bull", source:"polymarket" },
  { id:"pm6",  question:"Will SEC approve spot ETH ETF options?",              yesPrice:0.35, noPrice:0.65, volume:780000,  sentiment:"bear", source:"polymarket" },
  { id:"gm1",  question:"Will BTC close above $90k on March 31?",             yesPrice:0.61, noPrice:0.39, volume:320000,  sentiment:"bull", source:"gemini" },
  { id:"gm2",  question:"Will ETH/BTC ratio rise above 0.038 this month?",    yesPrice:0.29, noPrice:0.71, volume:180000,  sentiment:"bear", source:"gemini" },
  { id:"gm3",  question:"Will DeFi TVL exceed $100B by end of Q1?",           yesPrice:0.44, noPrice:0.56, volume:240000,  sentiment:"neut", source:"gemini" },
  { id:"gm4",  question:"Will ARB token recover above $1.50 in March?",       yesPrice:0.38, noPrice:0.62, volume:95000,   sentiment:"bear", source:"gemini" },
];

const SENT_COLORS = {
  bull: "#39FF14",
  bear: "#FF3A3A",
  neut: "#7b5ea7",
};

function fmtVol(n: number): string {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  return `$${(n/1000).toFixed(0)}K`;
}

export default function MarketsPage() {
  const [tab, setTab] = useState<"polymarket" | "gemini">("polymarket");
  const filtered = MARKETS.filter(m => m.source === tab);

  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar />
      <div style={{ overflow: "auto", padding: "24px 28px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div className="shimmer-text" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", marginBottom: 6 }}>
            Prediction Markets
          </div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(0,220,255,0.4)" }}>
            SELECT A MARKET TO OPEN A DARK POOL ORDER
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
          {(["polymarket","gemini"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: 8, letterSpacing: 3, padding: "6px 16px",
              border: "1px solid", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
              background: tab === t ? "rgba(0,220,255,0.08)" : "transparent",
              borderColor: tab === t ? "rgba(0,220,255,0.4)" : "rgba(0,220,255,0.15)",
              color: tab === t ? "#00DCFF" : "rgba(0,220,255,0.4)",
              transition: "all 0.2s",
            }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {/* Market grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map(m => (
            <Link key={m.id} href={`/trade?market=${m.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)",
                border: "1px solid rgba(0,220,255,0.10)", borderRadius: 10,
                padding: "14px 16px", cursor: "pointer",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(0,220,255,0.3)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0,220,255,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(0,220,255,0.10)";
                e.currentTarget.style.boxShadow = "none";
              }}
              >
                {/* Question */}
                <div style={{ fontSize: 11, lineHeight: 1.5, color: "#b8cfe0", marginBottom: 12,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {m.question}
                </div>
                {/* Prices */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: "6px 8px", background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.15)", borderRadius: 6 }}>
                    <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(57,255,20,0.6)", textTransform: "uppercase", marginBottom: 3 }}>YES</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#39FF14", textShadow: "0 0 8px rgba(57,255,20,0.5)" }}>{(m.yesPrice * 100).toFixed(0)}¢</div>
                  </div>
                  <div style={{ flex: 1, padding: "6px 8px", background: "rgba(255,58,58,0.06)", border: "1px solid rgba(255,58,58,0.15)", borderRadius: 6 }}>
                    <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,58,58,0.6)", textTransform: "uppercase", marginBottom: 3 }}>NO</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#FF3A3A", textShadow: "0 0 8px rgba(255,58,58,0.4)" }}>{(m.noPrice * 100).toFixed(0)}¢</div>
                  </div>
                </div>
                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "#FF8C00" }}>Vol: {fmtVol(m.volume)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: SENT_COLORS[m.sentiment], boxShadow: `0 0 6px ${SENT_COLORS[m.sentiment]}` }} />
                    <span style={{ fontSize: 8, letterSpacing: 1, color: SENT_COLORS[m.sentiment], textTransform: "uppercase" }}>{m.sentiment}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
