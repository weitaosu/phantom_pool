"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import SettlementSeq from "@/components/dashboard/SettlementSeq";

type Side = "YES" | "NO";
type Step = 1 | 2 | 3 | 4;

function TradeContent() {
  const params = useSearchParams();
  const marketId = params.get("market") ?? "pm1";

  const [step, setStep]       = useState<Step>(1);
  const [side, setSide]       = useState<Side>("YES");
  const [size, setSize]       = useState("10000");
  const [price, setPrice]     = useState("68");
  const [iceSlice, setIceSlice] = useState("1000");
  const [jitter, setJitter]   = useState("Medium (5-15s)");
  const [randomWaterline, setRandomWaterline] = useState(45);
  const [randomDurations, setRandomDurations] = useState(() => [0,1,2,3,4].map(() => 0.8 + Math.random() * 4.5));
  const [commitHash, setCommitHash] = useState("");
  const [settleTrigger, setSettleTrigger] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Generate deterministic-looking fake commit hash for demo
    const hash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    setCommitHash(hash);
  }, []);

  const stepLabels = ["Configure", "Iceberg", "Commit", "Reveal & Settle"];

  const jitterDurations: Record<string, number[]> = {
    "Low (2-5s)":    [0.8, 1.0, 0.9, 1.1],
    "Medium (5-15s)":[2.0, 2.4, 2.2, 2.6],
    "High (15-60s)": [4.5, 5.0, 5.5, 4.8],
  };
  const dotDurations = jitter === "Random"
    ? randomDurations
    : (jitterDurations[jitter] ?? jitterDurations["Medium (5-15s)"]);

  const jitterWaterline: Record<string, string> = {
    "Low (2-5s)":    "66%",
    "Medium (5-15s)":"52%",
    "High (15-60s)": "34%",
  };
  const waterlineTop = jitter === "Random" ? `${randomWaterline}%` : (jitterWaterline[jitter] ?? "52%");
  // Tip height = distance from top-padding (10px) to waterline
  const waterlinePx = (parseFloat(waterlineTop) / 100) * 120;
  const tipHeight = Math.max(16, waterlinePx - 10);

  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 240px", overflow: "hidden" }}>

        {/* Left: Iceberg preview */}
        <div style={{ borderRight: "1px solid rgba(0,220,255,0.10)", background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="panel-label" style={{ margin: "-16px -16px 0", padding: "10px 16px 8px" }}><span>Iceberg Preview</span></div>
          {/* Outer wrapper: relative, no overflow clip so dots can travel up */}
          <div style={{ marginTop: 8, position: "relative", height: 120, borderRadius: 8, border: "1px solid rgba(0,220,255,0.08)" }}>
            {/* Clipped layer: ghost + tip + waterline */}
            <div style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:8, background:"linear-gradient(to bottom, rgba(0,220,255,0.02), rgba(0,10,30,0.5))" }}>
              {/* Ghost */}
              <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:120, height:80, background:"linear-gradient(to bottom, transparent, rgba(0,220,255,0.07))", clipPath:"polygon(18%0%,82%0%,100%100%,0%100%)" }} />
              {/* Tip - width from iceSlice/size ratio, height tracks waterline */}
              <div style={{
                position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
                width: Math.max(20, Math.min(60, parseInt(iceSlice||"0") / parseInt(size||"1") * 100)),
                height: tipHeight,
                background:"rgba(0,220,255,0.12)",
                clipPath:"polygon(8%100%,92%100%,50%0%)",
                animation:"bergBreathe 3.5s ease-in-out infinite",
                transition:"height 0.5s ease",
              }} />
              {/* Waterline */}
              <div style={{ position:"absolute", top:waterlineTop, width:"100%", zIndex:2, transition:"top 0.5s ease" }}>
                <div style={{ fontSize:7, letterSpacing:2, color:"rgba(0,220,255,0.4)", position:"absolute", right:8, top:-14 }}>VISIBLE</div>
                <div style={{ width:"100%", height:1, background:"linear-gradient(90deg, transparent, rgba(0,220,255,0.5), transparent)" }} />
                <div style={{ fontSize:7, letterSpacing:2, color:"rgba(0,220,255,0.2)", position:"absolute", left:8, top:6 }}>HIDDEN ▼</div>
              </div>
            </div>
            {/* Pulse dots — outside clip so they travel above waterline */}
            {([
              { left:"15%", size:5 },
              { left:"32%", size:7 },
              { left:"50%", size:4 },
              { left:"66%", size:6 },
              { left:"80%", size:5 },
            ]).map((d, i) => (
              <div key={i} style={{
                position:"absolute", top:waterlineTop, left:d.left,
                transition:"top 0.5s ease",
                width:d.size, height:d.size, borderRadius:"50%",
                background:"#39FF14",
                boxShadow:"0 0 8px #39FF14, 0 0 16px rgba(57,255,20,0.45)",
                animation:`pdotCross ${dotDurations[i % dotDurations.length]}s ease-out ${i * (dotDurations[i % dotDurations.length] * 0.22)}s infinite`,
                pointerEvents:"none",
              }} />
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
            <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
              <span>Jitter</span><span style={{ color:"#FF8C00" }}>{jitter}</span>
            </div>
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
                Will BTC exceed $100k before April 2026?
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
                    <button key={opt} onClick={() => {
                      setJitter(opt);
                      if (opt === "Random") {
                        setRandomWaterline(25 + Math.floor(Math.random() * 45));
                        setRandomDurations([0,1,2,3,4].map(() => 0.8 + Math.random() * 4.5));
                      }
                    }} style={{
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
                ⚠ This will call <span style={{color:"#FF8C00"}}>commitOrder(bytes32)</span> on DarkPoolArbiter.sol — no USDC is transferred yet.
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <BackBtn onClick={() => setStep(2)} />
                <NextBtn onClick={() => { setStep(4); setSettleTrigger(t => t+1); setTimeout(() => setSettled(true), 2200); }}>Sign & Commit →</NextBtn>
              </div>
            </div>
          )}

          {/* Step 4: Reveal */}
          {step === 4 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:9, color:"rgba(0,220,255,0.4)", letterSpacing:1, lineHeight:1.8 }}>
                Reveal your order details on-chain and lock USDC in escrow. The matching engine will then match you off-chain.
              </div>

              <SectionLabel>Settlement Progress</SectionLabel>
              <SettlementSeq trigger={settleTrigger} />

              <div style={{ padding:"12px 14px", border:"1px solid rgba(57,255,20,0.2)", borderRadius:8, background:"rgba(57,255,20,0.04)", fontSize:9, color:"rgba(57,255,20,0.8)", letterSpacing:0.5, lineHeight:1.6 }}>
                ✓ Order committed on-chain<br/>
                ✓ Matching engine notified<br/>
                ○ Awaiting dark pool match...
              </div>

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
              { label:"Market",    val:"BTC >$100k Apr26" },
              { label:"Side",      val:side,     color: side==="YES"?"#39FF14":"#FF3A3A" },
              { label:"Size",      val:`$${parseInt(size||"0").toLocaleString()}` },
              { label:"Limit",     val:`${price}¢` },
              { label:"Ice Slice", val:`$${parseInt(iceSlice||"0").toLocaleString()}` },
              { label:"Type",      val:"DARK ICEBERG", color:"#FF8C00" },
              { label:"Chain",     val:"Polygon", color:"rgba(0,220,255,0.7)" },
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
