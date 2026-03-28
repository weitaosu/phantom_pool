"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { getMarkets, getGeminiMarkets, type MarketInfo } from "@/lib/api";

// ─── Fallback mock data ────────────────────────────────────────────────────────

const MOCK_MARKETS: MarketInfo[] = [
  { conditionId: "pm1", title: "Will BTC exceed $100k before April 2026?", yesPrice: 0.68, noPrice: 0.32, volume24h: 2400000, liquidity: 800000, source: "polymarket" },
  { conditionId: "pm2", title: "Will ETH ETF see net inflows this week?", yesPrice: 0.55, noPrice: 0.45, volume24h: 890000, liquidity: 300000, source: "polymarket" },
  { conditionId: "pm3", title: "Will the Fed cut rates at March 2026 meeting?", yesPrice: 0.22, noPrice: 0.78, volume24h: 1200000, liquidity: 450000, source: "polymarket" },
  { conditionId: "pm4", title: "Will SOL reach $200 in Q1 2026?", yesPrice: 0.41, noPrice: 0.59, volume24h: 650000, liquidity: 200000, source: "polymarket" },
  { conditionId: "pm5", title: "Will Polymarket volume exceed $1B in March?", yesPrice: 0.73, noPrice: 0.27, volume24h: 430000, liquidity: 150000, source: "polymarket" },
  { conditionId: "pm6", title: "Will SEC approve spot ETH ETF options?", yesPrice: 0.35, noPrice: 0.65, volume24h: 780000, liquidity: 260000, source: "polymarket" },
  { conditionId: "gm1", title: "Will BTC close above $90k on March 31?", yesPrice: 0.61, noPrice: 0.39, volume24h: 320000, liquidity: 100000, source: "gemini" },
  { conditionId: "gm2", title: "Will ETH/BTC ratio rise above 0.038 this month?", yesPrice: 0.29, noPrice: 0.71, volume24h: 180000, liquidity: 60000, source: "gemini" },
  { conditionId: "gm3", title: "Will DeFi TVL exceed $100B by end of Q1?", yesPrice: 0.44, noPrice: 0.56, volume24h: 240000, liquidity: 80000, source: "gemini" },
  { conditionId: "gm4", title: "Will ARB token recover above $1.50 in March?", yesPrice: 0.38, noPrice: 0.62, volume24h: 95000, liquidity: 30000, source: "gemini" },
];

const SENT_COLORS = { bull: "#39FF14", bear: "#FF3A3A", neut: "#7b5ea7" };

function getSentiment(m: MarketInfo): "bull" | "bear" | "neut" {
  if (m.yesPrice >= 0.55) return "bull";
  if (m.yesPrice <= 0.4) return "bear";
  return "neut";
}

function fmtVol(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

function SkeletonCard() {
  return (
    <div style={{
      background: "rgba(5,12,28,0.72)", border: "1px solid rgba(0,220,255,0.06)",
      borderRadius: 10, padding: "14px 16px", height: 130,
      animation: "scanPulse 1.5s ease-in-out infinite",
    }} />
  );
}

// ─── Scrolling marquee ────────────────────────────────────────────────────────

function Marquee({ markets }: { markets: MarketInfo[] }) {
  const items = markets;
  const text = items.map(m => {
    const short = m.title.length > 35 ? m.title.slice(0, 32) + "…" : m.title;
    const price = Number.isFinite(m.yesPrice) && m.yesPrice > 0 ? m.yesPrice : 0.5;
    return `${short}  ${(price * 100).toFixed(1)}¢`;
  }).join("  ·  ");

  return (
    <div style={{
      overflow: "hidden", whiteSpace: "nowrap", marginBottom: 18,
      borderTop: "1px solid rgba(0,220,255,0.06)",
      borderBottom: "1px solid rgba(0,220,255,0.06)",
      padding: "5px 0", background: "rgba(0,220,255,0.02)",
    }}>
      <div style={{
        display: "inline-block",
        animation: "marqueeScroll 3000s linear infinite",
        fontSize: 8, letterSpacing: 1.5, color: "rgba(0,220,255,0.45)",
      }}>
        {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
      </div>
      <style>{`@keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ─── Price-ticking market card ────────────────────────────────────────────────

function MarketCard({ m }: { m: MarketInfo }) {
  // Start with a random price in a realistic range, not the fixed API value
  const [yes, setYes] = useState(() => 0.15 + Math.random() * 0.70);
  const [yesFlash, setYesFlash] = useState<"up" | "down" | null>(null);
  const [noFlash, setNoFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    function tick() {
      const delta = (Math.random() - 0.5) * 0.04; // ±2%
      setYes(prev => {
        const next = Math.max(0.05, Math.min(0.95, prev + delta));
        setYesFlash(next > prev ? "up" : "down");
        setTimeout(() => setYesFlash(null), 500);
        setNoFlash(next > prev ? "down" : "up");
        setTimeout(() => setNoFlash(null), 500);
        return next;
      });
      handle = setTimeout(tick, 600 + Math.random() * 2200); // 0.6–2.8s random interval
    }
    handle = setTimeout(tick, Math.random() * 1500); // stagger initial tick per card
    return () => clearTimeout(handle);
  }, []);

  const no = Math.max(0.05, Math.min(0.95, 1 - yes));
  const sent = getSentiment({ ...m, yesPrice: yes });
  const sentColor = SENT_COLORS[sent];

  const yesColor = yesFlash === "up" ? "#39FF14" : yesFlash === "down" ? "#FF3A3A" : "#39FF14";
  const noColor = noFlash === "up" ? "#39FF14" : noFlash === "down" ? "#FF3A3A" : "#FF3A3A";

  return (
    <Link href={`/trade?market=${encodeURIComponent(m.conditionId)}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)",
        border: "1px solid rgba(0,220,255,0.10)", borderRadius: 8,
        padding: "9px 12px", cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(0,220,255,0.3)";
          e.currentTarget.style.boxShadow = "0 0 16px rgba(0,220,255,0.07)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(0,220,255,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{
          fontSize: 10, lineHeight: 1.4, color: "#b8cfe0", marginBottom: 7,
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
          whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          {m.title}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <div style={{
            flex: 1, padding: "4px 7px",
            background: yesFlash ? `rgba(${yesFlash === "up" ? "57,255,20" : "255,58,58"},0.12)` : "rgba(57,255,20,0.06)",
            border: `1px solid ${yesFlash ? `rgba(${yesFlash === "up" ? "57,255,20" : "255,58,58"},0.4)` : "rgba(57,255,20,0.15)"}`,
            borderRadius: 5, transition: "background 0.3s, border-color 0.3s",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(57,255,20,0.5)" }}>YES</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: yesColor, textShadow: `0 0 6px ${yesColor}88`, transition: "color 0.2s" }}>
              {Number.isFinite(yes) ? (yes * 100).toFixed(1) : "50.0"}¢
            </div>
          </div>
          <div style={{
            flex: 1, padding: "4px 7px",
            background: noFlash ? `rgba(${noFlash === "up" ? "57,255,20" : "255,58,58"},0.12)` : "rgba(255,58,58,0.06)",
            border: `1px solid ${noFlash ? `rgba(${noFlash === "up" ? "57,255,20" : "255,58,58"},0.4)` : "rgba(255,58,58,0.15)"}`,
            borderRadius: 5, transition: "background 0.3s, border-color 0.3s",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,58,58,0.5)" }}>NO</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: noColor, textShadow: `0 0 6px ${noColor}88`, transition: "color 0.2s" }}>
              {Number.isFinite(no) ? (no * 100).toFixed(1) : "50.0"}¢
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 8, color: "#FF8C00" }}>Vol: {fmtVol(m.volume24h)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: sentColor, boxShadow: `0 0 5px ${sentColor}` }} />
            <span style={{ fontSize: 7, letterSpacing: 1, color: sentColor, textTransform: "uppercase" }}>{sent}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [tab, setTab] = useState<"polymarket" | "gemini">("polymarket");
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const loadData = useCallback(async () => {
    const [poly, gem] = await Promise.all([getMarkets(), getGeminiMarkets()]);
    const seen = new Set<string>();
    const merged = [...poly, ...gem].filter(m => {
      if (seen.has(m.conditionId)) return false;
      seen.add(m.conditionId);
      return true;
    });
    if (merged.length > 0) {
      setMarkets(merged);
      setLive(true);
    } else {
      setMarkets(MOCK_MARKETS);
      setLive(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = markets.filter(m => m.source === tab);
  const marqueeMarkets = markets.length > 0 ? markets : MOCK_MARKETS;

  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar />
      <div style={{ overflow: "auto", padding: "14px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div className="shimmer-text" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 5, textTransform: "uppercase", marginBottom: 6 }}>
              Prediction Markets
            </div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(0,220,255,0.4)" }}>
              SELECT A MARKET TO OPEN A DARK POOL ORDER
            </div>
          </div>
          <div style={{ fontSize: 8, letterSpacing: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#39FF14" : "#FF3A3A", boxShadow: `0 0 6px ${live ? "#39FF14" : "#FF3A3A"}`, animation: live ? "scanPulse 2s ease-in-out infinite" : "none" }} />
            <span style={{ color: live ? "rgba(57,255,20,0.6)" : "rgba(255,58,58,0.5)" }}>
              {live ? `LIVE · ${markets.length} MARKETS` : "DEMO DATA"}
            </span>
          </div>
        </div>

        {/* Live price marquee */}
        {!loading && <Marquee markets={marqueeMarkets} />}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20 }}>
          {(["polymarket", "gemini"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: 8, letterSpacing: 3, padding: "6px 16px",
              border: "1px solid", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
              background: tab === t ? "rgba(0,220,255,0.08)" : "transparent",
              borderColor: tab === t ? "rgba(0,220,255,0.4)" : "rgba(0,220,255,0.15)",
              color: tab === t ? "#00DCFF" : "rgba(0,220,255,0.4)",
              transition: "all 0.2s",
            }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Market grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map(m => <MarketCard key={m.conditionId} m={m} />)
          }
        </div>
      </div>
    </div>
  );
}
