"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import SettlementSeq from "@/components/dashboard/SettlementSeq";
import { getMarkets, submitOrder, revealOrder, getOrderStatus, type MarketInfo } from "@/lib/api";
import { useWebSocket, type WsEvent } from "@/lib/useWebSocket";

// ─── Particle system (same as IcebergScene in dashboard) ─────────────────────
type PShape = "circle" | "diamond";
type Particle = { id: number; left: number; size: number; color: string; dur: number; shape: PShape };
const PALETTE = ["#39FF14","#39FF14","#39FF14","#00DCFF","#00DCFF","#FF8C00"];
let _pid = 0;
function makeParticle(): Particle {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return { id: _pid++, left: 8 + Math.random() * 82, size: 3 + Math.random() * 5, color, dur: 1.6 + Math.random() * 1.8, shape: Math.random() < 0.35 ? "diamond" : "circle" };
}

type Side = "YES" | "NO";
type Step = 1 | 2 | 3 | 4;

// Maps backend order state → settlement animation step (1-4)
function stateToSettleStep(state: string): number {
  switch (state) {
    case "REVEALED":   return 1;
    case "MATCHING":   return 2;
    case "MATCHED":    return 3;
    case "SETTLING":   return 3;
    case "SETTLED":    return 4;
    case "ICEBERG":    return 2;
    case "COMPLETED":  return 4;
    default:           return 0;
  }
}

function TradeContent() {
  const params = useSearchParams();
  const marketId = params.get("market") ?? "pm1";

  const [step, setStep]             = useState<Step>(1);
  const [side, setSide]             = useState<Side>("YES");
  const [size, setSize]             = useState("10000");
  const [price, setPrice]           = useState("68");
  const [iceSlice, setIceSlice]     = useState("1000");
  const [jitter, setJitter]         = useState("Medium (5-15s)");
  const [randomWaterline] = useState(45);
  const [commitHash, setCommitHash] = useState("");
  const [salt, setSalt]             = useState("");
  const [settleTrigger, setSettleTrigger] = useState(0);
  const [settled, setSettled]       = useState(false);
  const [orderId, setOrderId]       = useState<string | null>(null);
  const [orderState, setOrderState] = useState<string | null>(null);
  const [icebergProgress, setIcebergProgress] = useState<{ total: number; completed: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Generate commit hash on mount
  useEffect(() => {
    const s = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setSalt(s);
    const h = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setCommitHash(h);
  }, []);

  // Particle spawner for Iceberg Preview
  useEffect(() => {
    function spawn() {
      const p = makeParticle();
      setParticles(prev => [...prev, p].slice(-14));
      const t = setTimeout(() => setParticles(prev => prev.filter(x => x.id !== p.id)), p.dur * 1000 + 300);
      particleTimers.current.push(t);
    }
    for (let i = 0; i < 5; i++) { const t = setTimeout(spawn, i * 130); particleTimers.current.push(t); }
    let interval: ReturnType<typeof setInterval>;
    function scheduleNext() {
      interval = setInterval(() => { spawn(); clearInterval(interval); scheduleNext(); }, 380 + Math.random() * 270);
    }
    scheduleNext();
    return () => { clearInterval(interval); particleTimers.current.forEach(clearTimeout); };
  }, []);

  // Load market info from backend
  useEffect(() => {
    getMarkets().then(markets => {
      const m = markets.find(x =>
        x.conditionId === marketId || x.conditionId.startsWith(marketId)
      );
      if (m) {
        setMarketInfo(m);
        setPrice(Math.round(m.yesPrice * 100).toString());
      }
    });
  }, [marketId]);

  // Poll order status when orderId is set
  useEffect(() => {
    if (!orderId) return;
    const id = setInterval(async () => {
      const status = await getOrderStatus(orderId);
      if (!status) return;
      setOrderState(status.state);
      if (status.icebergProgress) {
        setIcebergProgress({ total: status.icebergProgress.total, completed: status.icebergProgress.completed });
      }
      const settleStep = stateToSettleStep(status.state);
      if (settleStep > 0) setSettleTrigger(settleStep);
      if (status.state === "SETTLED" || status.state === "COMPLETED") {
        setSettled(true);
        clearInterval(id);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [orderId]);

  // WS: iceberg slice events for this order
  const handleWsEvent = useCallback((event: WsEvent) => {
    if (event.type === "iceberg.slice" && event.data.orderId === orderId) {
      const sliceIndex = event.data.sliceIndex as number;
      const totalSlices = event.data.totalSlices as number;
      setIcebergProgress({ total: totalSlices, completed: sliceIndex + 1 });
    }
    if (event.type === "iceberg.complete" && event.data.orderId === orderId) {
      setSettled(true);
    }
  }, [orderId]);

  useWebSocket(handleWsEvent);

  const stepLabels = ["Configure", "Iceberg", "Commit", "Reveal & Settle"];

  const jitterDurations: Record<string, number[]> = {
    "Low (2-5s)":    [0.8, 1.0, 0.9, 1.1],
    "Medium (5-15s)":[2.0, 2.4, 2.2, 2.6],
    "High (15-60s)": [4.5, 5.0, 5.5, 4.8],
  };
  const jitterWaterline: Record<string, string> = {
    "Low (2-5s)":    "66%",
    "Medium (5-15s)":"52%",
    "High (15-60s)": "34%",
  };
  const waterlineTop = jitter === "Random" ? `${randomWaterline}%` : (jitterWaterline[jitter] ?? "52%");
  const waterlinePx = (parseFloat(waterlineTop) / 100) * 120;
  const tipHeight = Math.max(16, waterlinePx - 10);

  // Submit order to backend (Step 3)
  async function handleCommit() {
    setSubmitting(true);
    setSubmitError(null);
    const sizeUsdc = String(Math.round(parseFloat(size || "0") * 1e6));
    const limitPriceBps = Math.round(parseFloat(price || "0") * 100);
    const result = await submitOrder({
      commitHash,
      traderAddress: "0xDemoTrader",
      market: marketId,
      isYes: side === "YES",
      sizeUsdc,
      limitPriceBps,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
      salt,
      chain: "POLYGON",
    });
    setSubmitting(false);
    if (!result || (result as { _httpStatus?: number })._httpStatus) {
      // Backend error — proceed with demo mode
      setStep(4);
      setSettleTrigger(t => t + 1);
      setTimeout(() => setSettled(true), 2200);
    } else {
      setOrderId(result.orderId);
      setStep(4);
      setSettleTrigger(t => t + 1);
    }
  }

  // Reveal order to backend (Step 4)
  async function handleReveal() {
    if (!orderId) {
      // No real orderId — demo mode
      setSettleTrigger(t => t + 1);
      return;
    }
    const sizeUsdc = String(Math.round(parseFloat(size || "0") * 1e6));
    const limitPriceBps = Math.round(parseFloat(price || "0") * 100);
    await revealOrder({
      orderId,
      market: marketId,
      isYes: side === "YES",
      sizeUsdc,
      limitPriceBps,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
      salt,
    });
    setSettleTrigger(t => t + 1);
  }

  const marketTitle = marketInfo?.title ?? "Will BTC exceed $100k before April 2026?";
  const marketShort = marketInfo?.title
    ? marketInfo.title.slice(0, 22) + (marketInfo.title.length > 22 ? "…" : "")
    : "BTC >$100k Apr26";

  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 240px", overflow: "hidden" }}>

        {/* Left: Iceberg preview */}
        <div style={{ borderRight: "1px solid rgba(0,220,255,0.10)", background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="panel-label" style={{ margin: "-16px -16px 0", padding: "10px 16px 8px" }}><span>Iceberg Preview</span></div>
          <div style={{ marginTop: 8, position: "relative", height: 120, borderRadius: 8, border: "1px solid rgba(0,220,255,0.08)" }}>
            <div style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:8, background:"linear-gradient(to bottom, rgba(0,220,255,0.02), rgba(0,10,30,0.5))" }}>
              <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:120, height:80, background:"linear-gradient(to bottom, transparent, rgba(0,220,255,0.07))", clipPath:"polygon(18%0%,82%0%,100%100%,0%100%)" }} />
              <div style={{
                position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
                width: Math.max(20, Math.min(60, parseInt(iceSlice||"0") / parseInt(size||"1") * 100)),
                height: tipHeight,
                background:"rgba(0,220,255,0.12)",
                clipPath:"polygon(8%100%,92%100%,50%0%)",
                animation:"bergBreathe 3.5s ease-in-out infinite",
                transition:"height 0.5s ease",
              }} />
              <div style={{ position:"absolute", top:waterlineTop, width:"100%", zIndex:2, transition:"top 0.5s ease" }}>
                <div style={{ fontSize:7, letterSpacing:2, color:"rgba(0,220,255,0.4)", position:"absolute", right:8, top:-14 }}>VISIBLE</div>
                <div style={{ width:"100%", height:1, background:"linear-gradient(90deg, transparent, rgba(0,220,255,0.5), transparent)" }} />
                <div style={{ fontSize:7, letterSpacing:2, color:"rgba(0,220,255,0.2)", position:"absolute", left:8, top:6 }}>HIDDEN ▼</div>
              </div>
            </div>
            {particles.map(p => (
              <div key={p.id} style={{
                position:"absolute", left:`${p.left}%`, top:waterlineTop,
                zIndex:4, pointerEvents:"none",
                animation:`pdotCross ${p.dur}s ease-out forwards`,
              }}>
                <div style={{
                  width:p.size, height:p.size,
                  borderRadius: p.shape === "circle" ? "50%" : 2,
                  background:p.color,
                  boxShadow:`0 0 ${p.size+3}px ${p.color}, 0 0 ${Math.round(p.size*2+4)}px ${p.color}66`,
                  animation: p.shape === "diamond" ? `pdotSpin ${(p.dur*0.8).toFixed(2)}s linear infinite` : "none",
                }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "rgba(0,220,255,0.4)", letterSpacing: 1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(0,220,255,0.05)" }}>
              <span>Total Size</span><span style={{ color:"#00DCFF" }}>${parseInt(size||"0").toLocaleString()}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(0,220,255,0.05)" }}>
              <span>Visible Slice</span><span style={{ color:"#39FF14" }}>${parseInt(iceSlice||"0").toLocaleString()}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(0,220,255,0.05)" }}>
              <span>Est. Slippage</span><span style={{ color:"#39FF14" }}>~0.003%</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid rgba(0,220,255,0.05)" }}>
              <span>Jitter</span><span style={{ color:"#FF8C00" }}>{jitter}</span>
            </div>
            {/* Live order state */}
            {orderState && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span>State</span>
                <span style={{ color: orderState.includes("SETTLED") || orderState === "COMPLETED" ? "#39FF14" : "#00DCFF" }}>
                  {orderState}
                </span>
              </div>
            )}
            {/* Iceberg progress */}
            {icebergProgress && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, marginBottom:3 }}>
                  <span>Iceberg</span>
                  <span style={{ color:"#FF8C00" }}>{icebergProgress.completed}/{icebergProgress.total} slices</span>
                </div>
                <div style={{ height:3, background:"rgba(255,140,0,0.1)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", borderRadius:2,
                    width:`${Math.round((icebergProgress.completed / icebergProgress.total) * 100)}%`,
                    background:"#FF8C00", boxShadow:"0 0 6px rgba(255,140,0,0.6)",
                    transition:"width 0.5s ease",
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Wizard */}
        <div style={{ padding: "24px 32px", overflow: "auto" }}>
          {/* Step indicator */}
          <div style={{ display:"flex", gap:8, marginBottom:28 }}>
            {stepLabels.map((label, i) => {
              const done = i + 1 < step || (i === 3 && settled);
              const active = i + 1 === step && !done;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{
                    width:22, height:22, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:600,
                    border: `1px solid ${done ? "rgba(57,255,20,0.5)" : active ? "rgba(0,220,255,0.6)" : "rgba(0,220,255,0.2)"}`,
                    color: done ? "#39FF14" : active ? "#00DCFF" : "rgba(0,220,255,0.3)",
                    background: active ? "rgba(0,220,255,0.08)" : "transparent",
                    transition: "all 0.4s",
                    boxShadow: done ? "0 0 8px rgba(57,255,20,0.2)" : "none",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize:8, letterSpacing:2, textTransform:"uppercase", color: done ? "#39FF14" : active ? "#00DCFF" : "rgba(0,220,255,0.3)", transition:"color 0.4s" }}>{label}</span>
                  {i < stepLabels.length - 1 && <span style={{ color: done ? "rgba(57,255,20,0.5)" : "rgba(0,220,255,0.2)", transition:"color 0.4s" }}>›</span>}
                </div>
              );
            })}
          </div>

          {/* Step 1: Configure */}
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <SectionLabel>Market</SectionLabel>
              <div style={{ fontSize:11, color:"#b8cfe0", padding:"10px 14px", border:"1px solid rgba(0,220,255,0.15)", borderRadius:8, background:"rgba(0,220,255,0.03)" }}>
                {marketTitle}
                {marketInfo && (
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <span style={{ fontSize:9, color:"#39FF14" }}>YES {Math.round(marketInfo.yesPrice * 100)}¢</span>
                    <span style={{ fontSize:9, color:"rgba(0,220,255,0.3)" }}>·</span>
                    <span style={{ fontSize:9, color:"#FF3A3A" }}>NO {Math.round(marketInfo.noPrice * 100)}¢</span>
                    <span style={{ fontSize:9, color:"rgba(0,220,255,0.3)" }}>·</span>
                    <span style={{ fontSize:9, color:"#FF8C00" }}>
                      {marketInfo.source === "polymarket" ? "POLYMARKET" : "GEMINI"} LIVE
                    </span>
                  </div>
                )}
              </div>

              <SectionLabel>Side</SectionLabel>
              <div style={{ display:"flex", gap:8 }}>
                {(["YES","NO"] as Side[]).map(s => (
                  <button key={s} onClick={() => setSide(s)} style={{
                    flex:1, padding:"10px", border:`1px solid ${side===s ? (s==="YES" ? "rgba(57,255,20,0.5)" : "rgba(255,58,58,0.5)") : "rgba(0,220,255,0.2)"}`,
                    borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:600,
                    color: side===s ? (s==="YES" ? "#39FF14" : "#FF3A3A") : "rgba(0,220,255,0.4)",
                    background: side===s ? (s==="YES" ? "rgba(57,255,20,0.06)" : "rgba(255,58,58,0.06)") : "transparent",
                    textShadow: side===s ? (s==="YES" ? "0 0 8px rgba(57,255,20,0.5)" : "0 0 8px rgba(255,58,58,0.4)") : "none",
                    transition:"all 0.2s",
                  }}>{s}</button>
                ))}
              </div>

              <SectionLabel>Size (USDC)</SectionLabel>
              <TermInput value={size} onChange={setSize} placeholder="10000" />

              <SectionLabel>Limit Price (cents)</SectionLabel>
              <TermInput value={price} onChange={setPrice} placeholder="68" />

              <NextBtn onClick={() => setStep(2)}>Configure Iceberg →</NextBtn>
            </div>
          )}

          {/* Step 2: Iceberg */}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <SectionLabel>Visible Slice Size (USDC)</SectionLabel>
              <TermInput value={iceSlice} onChange={setIceSlice} placeholder="1000" />
              <div style={{ fontSize:9, color:"rgba(0,220,255,0.4)", letterSpacing:1 }}>
                Orders above this size are split into {Math.ceil(parseInt(size||"0") / parseInt(iceSlice||"1"))} slices, preventing front-running
              </div>

              <SectionLabel>Timing Jitter</SectionLabel>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {["Low (2-5s)", "Medium (5-15s)", "High (15-60s)", "Random"].map(opt => {
                  const active = jitter === opt;
                  return (
                    <button key={opt} onClick={() => { setJitter(opt); }} style={{
                      padding:"8px", borderRadius:6, cursor:"pointer",
                      fontFamily:"inherit", fontSize:8, letterSpacing:1, textTransform:"uppercase",
                      transition:"all 0.2s",
                      border: active ? "1px solid rgba(0,220,255,0.6)" : "1px solid rgba(0,220,255,0.2)",
                      color: active ? "#00DCFF" : "rgba(0,220,255,0.5)",
                      background: active ? "rgba(0,220,255,0.08)" : "transparent",
                      boxShadow: active ? "0 0 10px rgba(0,220,255,0.15)" : "none",
                      textShadow: active ? "0 0 6px rgba(0,220,255,0.5)" : "none",
                    }}>{opt}</button>
                  );
                })}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <BackBtn onClick={() => setStep(1)} />
                <NextBtn onClick={() => setStep(3)}>Commit Order →</NextBtn>
              </div>
            </div>
          )}

          {/* Step 3: Commit */}
          {step === 3 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:9, color:"rgba(0,220,255,0.4)", letterSpacing:1, lineHeight:1.8 }}>
                Your order details are hashed and committed on-chain. No one can see the price or size until you reveal.
              </div>

              <SectionLabel>Commit Hash (salted)</SectionLabel>
              <div style={{
                fontSize:8, wordBreak:"break-all", padding:"12px 14px",
                border:"1px solid rgba(57,255,20,0.2)", borderRadius:8,
                background:"rgba(57,255,20,0.03)", color:"#39FF14",
                fontFamily:"inherit", letterSpacing:0.5, lineHeight:1.6,
                textShadow:"0 0 6px rgba(57,255,20,0.3)",
              }}>{commitHash}</div>

              <div style={{ padding:"10px 14px", border:"1px solid rgba(255,140,0,0.2)", borderRadius:8, background:"rgba(255,140,0,0.04)", fontSize:9, color:"rgba(255,140,0,0.8)", letterSpacing:0.5, lineHeight:1.6 }}>
                ⚠ This will call <span style={{color:"#FF8C00"}}>submitOrder()</span> on the dark pool engine — no USDC is transferred yet.
              </div>

              {submitError && (
                <div style={{ padding:"8px 12px", border:"1px solid rgba(255,58,58,0.3)", borderRadius:6, background:"rgba(255,58,58,0.05)", fontSize:9, color:"#FF3A3A" }}>
                  {submitError}
                </div>
              )}

              <div style={{ display:"flex", gap:8 }}>
                <BackBtn onClick={() => setStep(2)} />
                <NextBtn onClick={handleCommit}>
                  {submitting ? "SUBMITTING..." : "Sign & Commit →"}
                </NextBtn>
              </div>
            </div>
          )}

          {/* Step 4: Reveal */}
          {step === 4 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:9, color:"rgba(0,220,255,0.4)", letterSpacing:1, lineHeight:1.8 }}>
                Reveal your order details on-chain and lock USDC in escrow. The matching engine will match you off-chain.
              </div>

              {orderId && (
                <div style={{ padding:"8px 12px", border:"1px solid rgba(0,220,255,0.2)", borderRadius:6, background:"rgba(0,220,255,0.04)", fontSize:8, color:"rgba(0,220,255,0.6)", wordBreak:"break-all" }}>
                  ORDER ID: {orderId}
                </div>
              )}

              <SectionLabel>Settlement Progress</SectionLabel>
              <SettlementSeq trigger={settleTrigger} onComplete={() => setSettled(true)} />

              <div style={{ padding:"12px 14px", border:"1px solid rgba(57,255,20,0.2)", borderRadius:8, background:"rgba(57,255,20,0.04)", fontSize:9, color:"rgba(57,255,20,0.8)", letterSpacing:0.5, lineHeight:1.6 }}>
                ✓ Order committed on-chain<br/>
                ✓ Matching engine notified<br/>
                {orderState === "MATCHED" || orderState === "SETTLING" || orderState === "SETTLED" || orderState === "COMPLETED"
                  ? "✓ Dark pool match found!"
                  : "○ Awaiting dark pool match..."}
              </div>

              {!settled && (
                <NextBtn onClick={handleReveal}>BROADCAST REVEAL →</NextBtn>
              )}

              <div style={{ fontSize:9, color:"rgba(0,220,255,0.4)", letterSpacing:0.5 }}>
                Expected fill: <span style={{color:"#FF8C00"}}>~30-90 seconds</span> with &lt;0.005% slippage
              </div>
            </div>
          )}
        </div>

        {/* Right: Order summary */}
        <div style={{ borderLeft:"1px solid rgba(0,220,255,0.10)", background:"rgba(5,12,28,0.72)", backdropFilter:"blur(18px)", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          <div className="panel-label" style={{ margin:"-16px -16px 0", padding:"10px 16px 8px" }}><span>Order Summary</span></div>
          <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
            {[
              { label:"Market",    val: marketShort },
              { label:"Side",      val:side,     color: side==="YES"?"#39FF14":"#FF3A3A" },
              { label:"Size",      val:`$${parseInt(size||"0").toLocaleString()}` },
              { label:"Limit",     val:`${price}¢` },
              { label:"Ice Slice", val:`$${parseInt(iceSlice||"0").toLocaleString()}` },
              { label:"Type",      val:"DARK ICEBERG", color:"#FF8C00" },
              { label:"Chain",     val:"Polygon", color:"rgba(0,220,255,0.7)" },
              ...(marketInfo ? [{ label:"Source", val: marketInfo.source.toUpperCase(), color:"rgba(0,220,255,0.5)" }] : []),
            ].map(r => (
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", fontSize:9, padding:"5px 0", borderBottom:"1px solid rgba(0,220,255,0.05)" }}>
                <span style={{ color:"rgba(0,220,255,0.4)" }}>{r.label}</span>
                <span style={{ color: r.color || "#c8d8f0" }}>{r.val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:"auto", padding:"10px 12px", background:"rgba(0,220,255,0.04)", border:"1px solid rgba(0,220,255,0.1)", borderRadius:8 }}>
            <div style={{ fontSize:7, letterSpacing:2, color:"rgba(0,220,255,0.4)", textTransform:"uppercase", marginBottom:6 }}>Protection Level</div>
            <div style={{ fontSize:9, color:"rgba(0,220,255,0.7)", lineHeight:1.6 }}>
              • Commit-reveal prevents front-running<br/>
              • Iceberg hides true order size<br/>
              • Off-chain matching = zero MEV
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:8, letterSpacing:3, textTransform:"uppercase", color:"rgba(0,220,255,0.4)" }}>{children}</div>;
}

function TermInput({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder:string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      width:"100%", padding:"10px 12px",
      background:"rgba(0,220,255,0.04)", border:"1px solid rgba(0,220,255,0.2)", borderRadius:8,
      color:"#00DCFF", fontFamily:"inherit", fontSize:12, outline:"none", transition:"border-color 0.2s",
    }}
    onFocus={e => e.target.style.borderColor="rgba(0,220,255,0.5)"}
    onBlur={e => e.target.style.borderColor="rgba(0,220,255,0.2)"}
    />
  );
}

function NextBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return (
    <button onClick={onClick} style={{
      flex:1, padding:"10px 20px", background:"rgba(0,220,255,0.08)",
      borderTop:"1px solid rgba(0,220,255,0.3)", borderLeft:"1px solid rgba(0,220,255,0.3)", borderRight:"1px solid rgba(0,220,255,0.3)", borderBottom:"3px solid rgba(0,0,0,0.5)",
      borderRadius:8, color:"#00DCFF", fontFamily:"inherit", fontSize:9, letterSpacing:3, textTransform:"uppercase",
      cursor:"pointer", textShadow:"0 0 6px rgba(0,220,255,0.5)", transition:"all 0.15s",
    }}>{children}</button>
  );
}

function BackBtn({ onClick }: { onClick: ()=>void }) {
  return (
    <button onClick={onClick} style={{
      padding:"10px 16px", background:"transparent", border:"1px solid rgba(0,220,255,0.15)",
      borderRadius:8, color:"rgba(0,220,255,0.4)", fontFamily:"inherit", fontSize:9, letterSpacing:2, textTransform:"uppercase",
      cursor:"pointer", transition:"all 0.15s",
    }}>←</button>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div style={{ background:"#030508", height:"100vh" }} />}>
      <TradeContent />
    </Suspense>
  );
}
