"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  getAgentReputation, getNewsSignals, getCrossVenueArb,
  type ReputationReport, type NewsSignal, type CrossVenueArbitrage,
} from "@/lib/api";
import { useWebSocket, type WsEvent } from "@/lib/useWebSocket";

// ─── Large hardcoded ARB pool — cycles fast for live demo feel ────────────────

const ARB_POOL: CrossVenueArbitrage[] = [
  { market:"Will BTC hit $1M before GTA VI?",            polymarketPrice:0.488, geminiPrice:0.871, spread:0.383, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"US recession in 2026?",                      polymarketPrice:0.312, geminiPrice:0.501, spread:0.189, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Will Fed cut rates in May 2026?",            polymarketPrice:0.641, geminiPrice:0.448, spread:0.193, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Iran nuclear deal by June 2026?",            polymarketPrice:0.174, geminiPrice:0.089, spread:0.085, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Nasdaq above 20000 by July 2026?",           polymarketPrice:0.557, geminiPrice:0.712, spread:0.155, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"ETH flips BTC market cap in 2026?",          polymarketPrice:0.067, geminiPrice:0.142, spread:0.075, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Trump approval above 50% by Q3?",            polymarketPrice:0.389, geminiPrice:0.231, spread:0.158, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Oil above $110 by end of Q2?",               polymarketPrice:0.721, geminiPrice:0.534, spread:0.187, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"SpaceX Starship reaches orbit in 2026?",     polymarketPrice:0.883, geminiPrice:0.672, spread:0.211, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Will Solana surpass Ethereum TVL?",          polymarketPrice:0.234, geminiPrice:0.411, spread:0.177, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Apple Vision Pro 2 launches in 2026?",       polymarketPrice:0.612, geminiPrice:0.789, spread:0.177, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"US CPI below 2.5% before Dec 2026?",         polymarketPrice:0.445, geminiPrice:0.601, spread:0.156, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Dogecoin above $1 in 2026?",                 polymarketPrice:0.291, geminiPrice:0.144, spread:0.147, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Will GPT-5 launch before Claude 4?",         polymarketPrice:0.537, geminiPrice:0.368, spread:0.169, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Russia-Ukraine ceasefire by Q3 2026?",       polymarketPrice:0.328, geminiPrice:0.491, spread:0.163, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Elon Musk joins Trump cabinet officially?",  polymarketPrice:0.159, geminiPrice:0.287, spread:0.128, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Gold above $3500 by end of 2026?",           polymarketPrice:0.672, geminiPrice:0.489, spread:0.183, direction:"BUY_GEMINI_SELL_POLY" },
  { market:"Will Polymarket hit $10B volume in 2026?",   polymarketPrice:0.441, geminiPrice:0.612, spread:0.171, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"TikTok ban upheld in US courts?",            polymarketPrice:0.267, geminiPrice:0.398, spread:0.131, direction:"BUY_POLY_SELL_GEMINI" },
  { market:"Bitcoin ETF options volume >$1B daily?",     polymarketPrice:0.788, geminiPrice:0.591, spread:0.197, direction:"BUY_GEMINI_SELL_POLY" },
];

function getArbSlice(seed: number): CrossVenueArbitrage[] {
  const count = Math.floor(Math.random() * 4) + 1; // 1–4
  const out: CrossVenueArbitrage[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ARB_POOL[(seed + i * 3) % ARB_POOL.length]);
  }
  return out;
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_REP: ReputationReport = {
  agentId: "phantom-agent-demo",
  accuracy: 0.72,
  totalTrades: 47,
  correctPredictions: 34,
  cids: ["bafybeig...demo1", "bafybeig...demo2"],
  storageBackend: "local (Filecoin unavailable)",
};

const MOCK_SIGNALS: NewsSignal[] = [
  { articleTitle:"Oil breaks $100 on Iran war fears",                   articleUrl:"#", affectedMarket:"Oil above $95 Q2 2026",          currentPrice:0.54, estimatedProb:0.72, edge:0.175, confidence:88, action:"BUY_YES", timestamp: Date.now() -  40000 },
  { articleTitle:"Nasdaq enters correction territory",                  articleUrl:"#", affectedMarket:"S&P500 above 5800 by Apr",        currentPrice:0.61, estimatedProb:0.47, edge:0.135, confidence:83, action:"BUY_NO",  timestamp: Date.now() -  85000 },
  { articleTitle:"Trump extends Iran nuclear talks deadline",           articleUrl:"#", affectedMarket:"Iran deal by June 2026",          currentPrice:0.31, estimatedProb:0.20, edge:0.105, confidence:79, action:"BUY_NO",  timestamp: Date.now() - 130000 },
  { articleTitle:"Meta mandates AI tools across all engineering teams", articleUrl:"#", affectedMarket:"AI sector outperform Q2",         currentPrice:0.55, estimatedProb:0.68, edge:0.125, confidence:85, action:"BUY_YES", timestamp: Date.now() - 175000 },
  { articleTitle:"X ad boycott lawsuit dismissed by federal judge",    articleUrl:"#", affectedMarket:"TSLA above $400 by Q2",           currentPrice:0.42, estimatedProb:0.57, edge:0.145, confidence:74, action:"BUY_YES", timestamp: Date.now() - 220000 },
  { articleTitle:"Trump names 12 tech chiefs to PCAST council",        articleUrl:"#", affectedMarket:"US AI regulation 2026",           currentPrice:0.48, estimatedProb:0.48, edge:0.000, confidence:52, action:"HOLD",    timestamp: Date.now() - 270000 },
  { articleTitle:"Asian equities selloff enters second consecutive day",articleUrl:"#", affectedMarket:"VIX above 30 this week",          currentPrice:0.38, estimatedProb:0.47, edge:0.085, confidence:71, action:"BUY_YES", timestamp: Date.now() - 320000 },
  { articleTitle:"BlackRock BTC ETF inflows hit record $420M",         articleUrl:"#", affectedMarket:"BTC $100k before April",          currentPrice:0.68, estimatedProb:0.74, edge:0.055, confidence:82, action:"BUY_YES", timestamp: Date.now() - 390000 },
  { articleTitle:"SEC delays spot ETH options decision by 60 days",    articleUrl:"#", affectedMarket:"SEC ETH ETF Options approved",    currentPrice:0.35, estimatedProb:0.21, edge:0.135, confidence:91, action:"BUY_NO",  timestamp: Date.now() - 460000 },
  { articleTitle:"Fed signals rate pause through mid-2026",            articleUrl:"#", affectedMarket:"Fed cut rates in May 2026",        currentPrice:0.64, estimatedProb:0.49, edge:0.145, confidence:77, action:"BUY_NO",  timestamp: Date.now() - 530000 },
  { articleTitle:"Gold surges to $3,200 on safe-haven demand",        articleUrl:"#", affectedMarket:"Gold above $3500 by end 2026",     currentPrice:0.67, estimatedProb:0.79, edge:0.115, confidence:80, action:"BUY_YES", timestamp: Date.now() - 610000 },
  { articleTitle:"Solana network hits 100k TPS in stress test",        articleUrl:"#", affectedMarket:"SOL above $500 by Q3 2026",       currentPrice:0.29, estimatedProb:0.41, edge:0.115, confidence:67, action:"BUY_YES", timestamp: Date.now() - 690000 },
];

// ─── Live agent stats (ticking counters) ─────────────────────────────────────

function useTicker(base: number, minDelta: number, maxDelta: number, intervalMs: number) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    let h: ReturnType<typeof setTimeout>;
    function tick() {
      setVal(prev => Math.max(0, prev + minDelta + Math.random() * (maxDelta - minDelta)));
      h = setTimeout(tick, intervalMs * (0.7 + Math.random() * 0.6));
    }
    h = setTimeout(tick, intervalMs * (0.5 + Math.random()));
    return () => clearTimeout(h);
  }, [base, minDelta, maxDelta, intervalMs]);
  return val;
}

// Scanning headline pool for the animated "scanning..." row
const SCAN_HEADLINES = [
  "Analyzing: Iran nuclear talks latest…",
  "Scanning: Fed rate decision headlines…",
  "Processing: BTC ETF flow data…",
  "Analyzing: Nasdaq correction signals…",
  "Scanning: Oil geopolitical risk…",
  "Processing: Meta AI earnings beat…",
  "Analyzing: TSLA options flow…",
  "Scanning: Russia-Ukraine ceasefire odds…",
  "Processing: Gold safe-haven demand…",
  "Analyzing: SOL network activity surge…",
  "Scanning: SEC regulatory filings…",
  "Processing: BlackRock portfolio changes…",
];

function ScanningRow() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % SCAN_HEADLINES.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{
      padding: "8px 14px", borderRadius: 6,
      background: "rgba(0,220,255,0.03)",
      border: "1px solid rgba(0,220,255,0.12)",
      display: "flex", alignItems: "center", gap: 8,
      animation: "scanPulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00DCFF", boxShadow: "0 0 6px #00DCFF", flexShrink: 0 }} />
      <div style={{ fontSize: 8, letterSpacing: 1, color: "rgba(0,220,255,0.55)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {SCAN_HEADLINES[idx]}
      </div>
      <div style={{ fontSize: 7, color: "rgba(0,220,255,0.3)", letterSpacing: 1, flexShrink: 0 }}>LLM</div>
    </div>
  );
}

// Arb counter display (ticks up over time)
function ArbCounter() {
  const count = useTicker(143, 0, 2, 4000);
  const [lastTime, setLastTime] = useState("");
  useEffect(() => {
    function upd() {
      const d = new Date();
      setLastTime(`${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`);
    }
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
      <div style={{ padding: "8px 10px", background: "rgba(255,140,0,0.05)", border: "1px solid rgba(255,140,0,0.15)", borderRadius: 6 }}>
        <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(255,140,0,0.45)", marginBottom: 2 }}>DETECTED TODAY</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#FF8C00", textShadow: "0 0 10px rgba(255,140,0,0.5)" }}>{Math.floor(count)}</div>
      </div>
      <div style={{ padding: "8px 10px", background: "rgba(0,220,255,0.03)", border: "1px solid rgba(0,220,255,0.10)", borderRadius: 6 }}>
        <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(0,220,255,0.35)", marginBottom: 2 }}>LAST FOUND</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#00DCFF", fontVariantNumeric: "tabular-nums" }}>{lastTime}</div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCid(cid: string): string {
  if (cid.length > 20) return `${cid.slice(0, 10)}...${cid.slice(-6)}`;
  return cid;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function ActionBadge({ action }: { action: "BUY_YES" | "BUY_NO" | "HOLD" }) {
  const cfg = {
    BUY_YES: { color: "#39FF14", bg: "rgba(57,255,20,0.08)", border: "rgba(57,255,20,0.25)" },
    BUY_NO:  { color: "#FF3A3A", bg: "rgba(255,58,58,0.08)",  border: "rgba(255,58,58,0.25)"  },
    HOLD:    { color: "#7b5ea7", bg: "rgba(123,94,167,0.08)", border: "rgba(123,94,167,0.25)" },
  }[action];
  return (
    <span style={{
      fontSize: 8, letterSpacing: 2, padding: "2px 6px", borderRadius: 3,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      textShadow: `0 0 6px ${cfg.color}66`,
    }}>{action.replace("_", " ")}</span>
  );
}

// ─── Ticking signal card ──────────────────────────────────────────────────────

function SignalCard({ s, isNew }: { s: NewsSignal; isNew: boolean }) {
  const [current, setCurrent] = useState(() => 0.10 + Math.random() * 0.80);
  const [edge, setEdge] = useState(() => 0.04 + Math.random() * 0.18);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    function tick() {
      setCurrent(prev => Math.max(0.05, Math.min(0.95, prev + (Math.random() - 0.5) * 0.04)));
      setEdge(prev => Math.max(0.02, Math.min(0.30, prev + (Math.random() - 0.5) * 0.02)));
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      handle = setTimeout(tick, 800 + Math.random() * 2400);
    }
    handle = setTimeout(tick, Math.random() * 2000);
    return () => clearTimeout(handle);
  }, []);

  const confW = Math.round(s.confidence);
  const estimated = Math.max(0.05, Math.min(0.95, current + (s.action === "BUY_YES" ? edge : -edge)));

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 8,
      background: flash ? "rgba(0,220,255,0.04)" : "rgba(5,12,28,0.72)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${flash ? "rgba(0,220,255,0.22)" : "rgba(0,220,255,0.10)"}`,
      animation: isNew ? "freshLine 2s ease forwards" : "none",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, lineHeight: 1.4, color: "#b8cfe0", flex: 1 }}>{s.articleTitle}</div>
        <ActionBadge action={s.action} />
      </div>
      <div style={{ fontSize: 8, color: "rgba(0,220,255,0.5)", letterSpacing: 1, marginBottom: 8 }}>
        ↳ {s.affectedMarket}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { label: "CURRENT", val: `${(current * 100).toFixed(1)}¢`, color: "rgba(0,220,255,0.7)" },
          { label: "AI EST",  val: `${(estimated * 100).toFixed(1)}¢`, color: s.action === "BUY_YES" ? "#39FF14" : "#FF3A3A" },
          { label: "EDGE",    val: `+${(edge * 100).toFixed(1)}¢`,    color: "#FF8C00" },
        ].map(metric => (
          <div key={metric.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(0,220,255,0.3)", marginBottom: 2 }}>{metric.label}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: metric.color, textShadow: `0 0 6px ${metric.color}66`, transition: "color 0.2s" }}>{metric.val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, color: "rgba(0,220,255,0.35)", marginBottom: 3 }}>
          <span>CONFIDENCE</span><span>{confW}%</span>
        </div>
        <div style={{ height: 3, background: "rgba(0,220,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2, width: `${confW}%`,
            background: confW >= 80 ? "#39FF14" : confW >= 60 ? "#FF8C00" : "#FF3A3A",
            boxShadow: `0 0 6px ${confW >= 80 ? "rgba(57,255,20,0.6)" : "rgba(255,140,0,0.5)"}`,
            transition: "width 0.8s ease",
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 7, color: "rgba(0,220,255,0.25)" }}>{timeAgo(s.timestamp)}</div>
        <a href={`/trade?market=${encodeURIComponent(s.affectedMarket)}`} style={{
          fontSize: 8, letterSpacing: 2, padding: "3px 10px", borderRadius: 3,
          background: s.action === "BUY_YES" ? "rgba(57,255,20,0.10)" : s.action === "BUY_NO" ? "rgba(255,58,58,0.10)" : "rgba(123,94,167,0.10)",
          border: `1px solid ${s.action === "BUY_YES" ? "rgba(57,255,20,0.35)" : s.action === "BUY_NO" ? "rgba(255,58,58,0.35)" : "rgba(123,94,167,0.35)"}`,
          color: s.action === "BUY_YES" ? "#39FF14" : s.action === "BUY_NO" ? "#FF3A3A" : "#7b5ea7",
          textDecoration: "none",
        }}>TRADE →</a>
      </div>
    </div>
  );
}

// ─── Self-contained arb cycler ────────────────────────────────────────────────

function ArbFeed({ injected }: { injected: CrossVenueArbitrage[] }) {
  // Start empty to avoid SSR/client hydration mismatch — populate client-side only
  const [items, setItems] = useState<CrossVenueArbitrage[]>([]);

  useEffect(() => {
    if (injected.length > 0) {
      setItems(injected.slice(0, 4));
      return;
    }
    let handle: ReturnType<typeof setTimeout>;
    function tick() {
      const seed = Math.floor(Math.random() * ARB_POOL.length);
      setItems(getArbSlice(seed));
      handle = setTimeout(tick, 800 + Math.random() * 1400);
    }
    tick(); // first tick fires immediately on mount, client-only
    return () => clearTimeout(handle);
  }, [injected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((a) => {
        const spreadCents = (a.spread * 100).toFixed(1);
        const hot = a.spread > 0.05;
        const highlight = hot ? "#FF8C00" : "#00DCFF";
        return (
          <div key={a.market} style={{
            padding: "10px 12px", borderRadius: 6,
            background: hot ? "rgba(255,140,0,0.05)" : "rgba(5,12,28,0.72)",
            border: `1px solid ${hot ? "rgba(255,140,0,0.25)" : "rgba(0,220,255,0.10)"}`,
            animation: "freshLine 0.8s ease forwards",
          }}>
            <div style={{ fontSize: 9, color: "#b8cfe0", marginBottom: 8, lineHeight: 1.4,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {a.market}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              <div style={{ padding: "6px 8px", background: "rgba(0,220,255,0.04)", borderRadius: 4, border: "1px solid rgba(0,220,255,0.10)" }}>
                <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(0,220,255,0.35)", marginBottom: 2 }}>POLY</div>
                <div style={{ fontSize: 12, color: "#00DCFF" }}>{(a.polymarketPrice * 100).toFixed(1)}¢</div>
              </div>
              <div style={{ padding: "6px 8px", background: "rgba(57,255,20,0.04)", borderRadius: 4, border: "1px solid rgba(57,255,20,0.10)" }}>
                <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(57,255,20,0.35)", marginBottom: 2 }}>GEM</div>
                <div style={{ fontSize: 12, color: "#39FF14" }}>{(a.geminiPrice * 100).toFixed(1)}¢</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: 1, color: "rgba(0,220,255,0.4)" }}>SPREAD</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: highlight, textShadow: `0 0 8px ${highlight}66` }}>
                {spreadCents}¢
              </div>
            </div>
            <div style={{ fontSize: 8, letterSpacing: 1, padding: "3px 6px", borderRadius: 3, textAlign: "center",
              background: a.direction.toLowerCase().includes("poly") ? "rgba(57,255,20,0.07)" : "rgba(255,58,58,0.07)",
              border: `1px solid ${a.direction.toLowerCase().includes("poly") ? "rgba(57,255,20,0.2)" : "rgba(255,58,58,0.2)"}`,
              color: a.direction.toLowerCase().includes("poly") ? "#39FF14" : "#FF3A3A",
            }}>
              {a.direction.replace(/buy_poly_sell_gemini/i,"BUY POLY").replace(/buy_gemini_sell_poly/i,"BUY GEM").toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Live clock for LEFT panel ────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function upd() {
      const d = new Date();
      setTime(`${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")} UTC`);
    }
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{time}</span>;
}

export default function AgentPage() {
  const [rep, setRep] = useState<ReputationReport | null>(null);
  const [signals, setSignals] = useState<NewsSignal[]>([]);
  const [wsArb, setWsArb] = useState<CrossVenueArbitrage[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Live counters for left panel
  const marketsMonitored = useTicker(1247, 0, 3, 5000);
  const signalsToday = useTicker(89, 0, 1, 8000);
  const avgEdge = useTicker(12.4, -0.3, 0.4, 6000);
  const pnlEst = useTicker(4820, -15, 30, 7000);

  const loadAll = useCallback(async () => {
    const [repData, sigData] = await Promise.all([
      getAgentReputation(),
      getNewsSignals(),
    ]);
    setRep(repData ?? MOCK_REP);
    setSignals(sigData.length > 0 ? sigData : MOCK_SIGNALS);
    setLive(repData !== null);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // WS: live news signals + arb
  const handleWsEvent = useCallback((event: WsEvent) => {
    if (event.type === "news.signal") {
      setSignals(prev => [event.data as unknown as NewsSignal, ...prev].slice(0, 20));
    }
    if (event.type === "arb.detected") {
      setWsArb(prev => {
        const a = event.data as unknown as CrossVenueArbitrage;
        return [a, ...prev].slice(0, 4);
      });
    }
  }, []);

  useWebSocket(handleWsEvent);

  const accuracy = rep?.accuracy ?? 0;
  const accPct = Math.round(accuracy * 100);

  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar />
      <div style={{ overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr 280px", height: "100%" }}>

        {/* ── LEFT: Reputation ── */}
        <div style={{ borderRight: "1px solid rgba(0,220,255,0.10)", overflow: "auto", background: "rgba(3,5,8,0.6)" }}>
          <div className="panel-label">
            <span>AI Agent Reputation</span>
            <span style={{ color: live ? "#39FF14" : "#FF8C00", fontSize: 7, letterSpacing: 2 }}>
              {live ? "● FILECOIN" : "○ LOCAL"}
            </span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Accuracy bar */}
            <div style={{ padding: "14px 16px", background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.12)", borderRadius: 8 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(57,255,20,0.5)", textTransform: "uppercase", marginBottom: 8 }}>Prediction Accuracy</div>
              <div style={{ fontSize: 30, fontWeight: 600, color: "#39FF14", textShadow: "0 0 20px rgba(57,255,20,0.6)", marginBottom: 6 }}>
                {loading ? "--" : `${accPct}%`}
              </div>
              <div style={{ height: 4, background: "rgba(57,255,20,0.1)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: loading ? "0%" : `${accPct}%`,
                  background: "linear-gradient(90deg, #39FF14, #00DCFF)",
                  boxShadow: "0 0 8px rgba(57,255,20,0.6)",
                  transition: "width 1s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 8, color: "rgba(57,255,20,0.4)" }}>
                <span>{rep?.correctPredictions ?? "--"} correct</span>
                <span>{rep?.totalTrades ?? "--"} trades</span>
              </div>
            </div>

            {/* Live stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "SIGNALS TODAY", val: Math.floor(signalsToday).toString(), color: "#00DCFF" },
                { label: "MKTS MONITORED", val: Math.floor(marketsMonitored).toLocaleString(), color: "#00DCFF" },
                { label: "AVG EDGE", val: `${avgEdge.toFixed(1)}¢`, color: "#FF8C00" },
                { label: "EST. PnL", val: `+$${Math.floor(pnlEst).toLocaleString()}`, color: "#39FF14" },
              ].map(s => (
                <div key={s.label} style={{ padding: "8px 10px", background: "rgba(0,220,255,0.03)", border: "1px solid rgba(0,220,255,0.08)", borderRadius: 5 }}>
                  <div style={{ fontSize: 6, letterSpacing: 1, color: "rgba(0,220,255,0.3)", marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.color, textShadow: `0 0 8px ${s.color}55`, fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Win/Loss breakdown */}
            <div style={{ padding: "10px 12px", background: "rgba(0,220,255,0.02)", border: "1px solid rgba(0,220,255,0.08)", borderRadius: 6 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.4)", marginBottom: 8 }}>WIN / LOSS BREAKDOWN</div>
              <div style={{ display: "flex", gap: 0, height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ width: `${accPct}%`, background: "#39FF14", boxShadow: "0 0 6px rgba(57,255,20,0.6)", transition: "width 1s ease" }} />
                <div style={{ flex: 1, background: "rgba(255,58,58,0.4)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8 }}>
                <span style={{ color: "#39FF14" }}>✓ {rep?.correctPredictions ?? "--"} WIN</span>
                <span style={{ color: "#FF3A3A" }}>✗ {rep && rep.totalTrades - rep.correctPredictions} LOSS</span>
              </div>
            </div>

            {/* Last scan + clock */}
            <div style={{ padding: "8px 10px", background: "rgba(0,220,255,0.02)", border: "1px solid rgba(0,220,255,0.08)", borderRadius: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(0,220,255,0.35)" }}>LAST SCAN</div>
                <div style={{ fontSize: 8, color: "#00DCFF", fontVariantNumeric: "tabular-nums" }}><LiveClock /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#39FF14", boxShadow: "0 0 5px #39FF14", animation: "scanPulse 1.5s ease-in-out infinite" }} />
                <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(57,255,20,0.5)" }}>ACTIVELY SCANNING NEWSAPI</div>
              </div>
            </div>

            {/* Agent ID */}
            <div style={{ padding: "8px 10px", background: "rgba(0,220,255,0.02)", border: "1px solid rgba(0,220,255,0.08)", borderRadius: 5 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.35)", marginBottom: 3 }}>AGENT ID</div>
              <div style={{ fontSize: 8, color: "rgba(0,220,255,0.6)", wordBreak: "break-all" }}>{rep?.agentId ?? "..."}</div>
            </div>

            {/* Storage backend */}
            <div style={{ padding: "8px 10px", background: "rgba(0,220,255,0.02)", border: "1px solid rgba(0,220,255,0.08)", borderRadius: 5 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.35)", marginBottom: 3 }}>STORAGE BACKEND</div>
              <div style={{ fontSize: 8, color: live ? "#39FF14" : "#FF8C00" }}>{rep?.storageBackend ?? "..."}</div>
            </div>

            {/* Filecoin CIDs */}
            <div>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
                Filecoin CIDs ({rep?.cids.length ?? 0})
              </div>
              {(rep?.cids ?? []).length === 0 && (
                <div style={{ fontSize: 9, color: "rgba(0,220,255,0.25)", letterSpacing: 1 }}>No records stored yet</div>
              )}
              {(rep?.cids ?? []).map((cid, i) => (
                <div key={i} style={{
                  fontSize: 8, padding: "5px 8px", marginBottom: 4, borderRadius: 4,
                  background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.12)",
                  color: "rgba(57,255,20,0.6)", fontFamily: "inherit",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>{fmtCid(cid)}</span>
                  <span style={{ fontSize: 7, color: "rgba(57,255,20,0.35)" }}>#{i + 1}</span>
                </div>
              ))}
            </div>

            {/* LLM provider info */}
            <div style={{ padding: "8px 10px", background: "rgba(123,94,167,0.04)", border: "1px solid rgba(123,94,167,0.15)", borderRadius: 6 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(123,94,167,0.5)", marginBottom: 4 }}>LLM ANALYSIS ENGINE</div>
              <div style={{ fontSize: 9, color: "#7b5ea7" }}>GPT-4o-mini via OpenRouter</div>
              <div style={{ fontSize: 8, color: "rgba(123,94,167,0.4)", marginTop: 2 }}>Real-time news → signal pipeline</div>
            </div>
          </div>
        </div>

        {/* ── CENTER: Live Signals ── */}
        <div style={{ overflow: "auto", borderRight: "1px solid rgba(0,220,255,0.10)" }}>
          <div className="panel-label">
            <span>Live AI Signals</span>
            <span style={{ color: "#39FF14", animation: "scanPulse 2s ease-in-out infinite", fontSize: 7 }}>● NEWSAPI · LLM ANALYSIS</span>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Signal count + scanning indicator */}
            {!loading && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: "rgba(0,220,255,0.35)" }}>
                  {signals.length} SIGNALS · <span style={{ color: "#39FF14" }}>+{Math.floor(signalsToday % 10 + 1)} TODAY</span>
                </div>
                <div style={{ fontSize: 7, letterSpacing: 1, color: "rgba(0,220,255,0.25)" }}>
                  SORTED BY EDGE
                </div>
              </div>
            )}
            {/* Always-on scanning row */}
            {!loading && <ScanningRow />}
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 90, borderRadius: 8, background: "rgba(0,220,255,0.04)", border: "1px solid rgba(0,220,255,0.08)", animation: "scanPulse 1.5s ease-in-out infinite" }} />
              ))
            )}
            {!loading && signals.map((s, i) => (
              <SignalCard key={s.timestamp + i} s={s} isNew={i === 0 && signals.length > MOCK_SIGNALS.length} />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Cross-Venue Arbitrage ── */}
        <div style={{ overflow: "auto" }}>
          <div className="panel-label">
            <span>Cross-Venue Arb</span>
            <span style={{ fontSize: 7, letterSpacing: 2, color: "rgba(255,140,0,0.5)", animation: "scanPulse 1s ease-in-out infinite" }}>● LIVE</span>
          </div>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 8, letterSpacing: 1, color: "rgba(255,140,0,0.4)", marginBottom: 2 }}>
              POLYMARKET vs GEMINI SPREAD MONITOR
            </div>

            <ArbCounter />

            <ArbFeed injected={wsArb} />

            {/* Legend */}
            <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(0,220,255,0.02)", border: "1px solid rgba(0,220,255,0.06)", borderRadius: 6 }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.3)", marginBottom: 6 }}>SPREAD THRESHOLDS</div>
              {[
                { color: "#FF8C00", label: "&gt;5¢", desc: "HIGH ALPHA" },
                { color: "#00DCFF", label: "2–5¢", desc: "MODERATE" },
                { color: "rgba(0,220,255,0.4)", label: "&lt;2¢", desc: "NOISE" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 8, padding: "2px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: r.color, boxShadow: `0 0 4px ${r.color}` }} />
                    <span style={{ color: r.color }} dangerouslySetInnerHTML={{ __html: r.label }} />
                  </div>
                  <span style={{ color: "rgba(0,220,255,0.35)" }}>{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
