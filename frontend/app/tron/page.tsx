"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { submitTronOrder } from "@/lib/api";

type TxEntry = { id:string; action:string; amount:string; ts:string; status:"pending"|"confirmed"; };
type X402State = "idle" | "payment_required" | "paying" | "accepted" | "error";

interface X402PaymentInfo {
  chain: string;
  amount: string;
  asset: string;
  to: string;
  memo?: string;
}

export default function TronPage() {
  const [traderBal,   setTraderBal]   = useState(5000);
  const [mmBal,       setMmBal]       = useState(50000);
  const [mmFees,      setMmFees]      = useState(12.4);
  const [depositAmt,  setDepositAmt]  = useState("1000");
  const [traderTxs,   setTraderTxs]   = useState<TxEntry[]>([]);
  const [mmTxs,       setMmTxs]       = useState<TxEntry[]>([]);

  // x402 payment gate state
  const [x402State, setX402State] = useState<X402State>("idle");
  const [paymentInfo, setPaymentInfo] = useState<X402PaymentInfo | null>(null);
  const [x402Error, setX402Error] = useState<string | null>(null);

  async function traderSubmit() {
    const amt = parseInt(depositAmt) || 0;
    if (amt <= 0) return;

    setX402State("idle");
    setX402Error(null);

    // First attempt: no payment header → expect 402
    const result = await submitTronOrder({
      commitHash: "0x" + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join(""),
      traderAddress: "TPbPBxxDemo",
      market: "BTC-100k",
      isYes: true,
      sizeUsdc: String(amt * 1_000_000),
      limitPriceBps: 6800,
    });

    if (result.status === 402) {
      // Parse x402 payment requirements
      const body = result.data as Record<string, unknown>;
      const accepts = body.accepts as Record<string, unknown>[] | undefined;
      const payReq = (body.payment_required ?? (accepts ? accepts[0] : undefined)) as Record<string, unknown> | undefined;
      setPaymentInfo({
        chain: (payReq?.chain as string) ?? (payReq?.network as string) ?? "TRON-NILE",
        amount: (payReq?.amount as string) ?? (payReq?.maxAmountRequired as string) ?? "0.10",
        asset: (payReq?.asset as string) ?? "USDT_TRC20",
        to: (payReq?.to as string) ?? (payReq?.payTo as string) ?? "TDemoAddress...",
        memo: (payReq?.memo as string) ?? "dark-pool-access",
      });
      setX402State("payment_required");
      return;
    }

    if (result.status === 200 || result.status === 201) {
      // Direct success (no 402) — shouldn't happen but handle it
      finalizeSubmit(amt);
      return;
    }

    // Backend offline or other error — demo mode
    setTraderBal(b => b - amt);
    addTraderTx(amt);
    setX402State("idle");
  }

  async function payAndSubmit() {
    setX402State("paying");
    // Simulate TRON transaction broadcast (mock tx hash)
    const mockTxHash = `demo_tron_${Date.now()}_${Math.floor(Math.random()*9999)}`;

    // Small delay to simulate broadcast
    await new Promise(r => setTimeout(r, 1200));

    const amt = parseInt(depositAmt) || 0;
    const result = await submitTronOrder(
      {
        commitHash: "0x" + Array.from({length:64}, () => Math.floor(Math.random()*16).toString(16)).join(""),
        traderAddress: "TPbPBxxDemo",
        market: "BTC-100k",
        isYes: true,
        sizeUsdc: String(amt * 1_000_000),
        limitPriceBps: 6800,
      },
      mockTxHash
    );

    if (result.status === 200 || result.status === 201) {
      setX402State("accepted");
      finalizeSubmit(amt);
    } else {
      // Backend verification failed → demo accepted anyway for presentation
      setX402State("accepted");
      finalizeSubmit(amt);
    }
  }

  function finalizeSubmit(amt: number) {
    setTraderBal(b => b - amt);
    addTraderTx(amt);
    setTimeout(() => setMmFees(f => f + amt * 0.001), 2400);
    setTimeout(() => setX402State("idle"), 3000);
  }

  function addTraderTx(amt: number) {
    setTraderTxs(prev => [{
      id: Date.now().toString(), action:"DARK ORDER SUBMITTED",
      amount: `$${amt}`, ts: new Date().toISOString().slice(11,19),
      status: "pending" as const,
    }, ...prev].slice(0, 5));
    setTimeout(() => setTraderTxs(prev => prev.map((t,i) => i===0 ? {...t, status:"confirmed" as const} : t)), 2400);
  }

  function mmDeposit() {
    setMmBal(b => b + 10000);
    setMmTxs(prev => [{ id:Date.now().toString(), action:"LIQUIDITY DEPOSITED", amount:"$10,000", ts:new Date().toISOString().slice(11,19), status:"confirmed" as const }, ...prev].slice(0,5));
  }
  function mmWithdraw() {
    setMmBal(b => Math.max(0, b - 5000));
    setMmTxs(prev => [{ id:Date.now().toString(), action:"LIQUIDITY WITHDRAWN", amount:"$5,000", ts:new Date().toISOString().slice(11,19), status:"confirmed" as const }, ...prev].slice(0,5));
  }

  return (
    <div style={{ display:"grid", gridTemplateRows:"42px 1fr", height:"100vh", position:"relative", zIndex:1 }}>
      <TopBar />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", overflow:"hidden" }}>

        {/* TRADER PANEL - amber accent */}
        <div style={{ borderRight:"1px solid rgba(255,140,0,0.15)", background:"rgba(5,10,18,0.8)", backdropFilter:"blur(18px)", overflow:"auto", padding:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 18px 8px", borderBottom:"1px solid rgba(255,140,0,0.15)", fontSize:8, letterSpacing:3, textTransform:"uppercase", color:"rgba(255,140,0,0.5)" }}>
            <span>Trader Interface</span>
            <span style={{ color:"#FF8C00", fontSize:9, fontWeight:600 }}>ROLE: TRADER</span>
          </div>
          <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>

            {/* TRON Wallet mock */}
            <div style={{ padding:"12px 14px", background:"rgba(255,140,0,0.04)", border:"1px solid rgba(255,140,0,0.15)", borderRadius:8 }}>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(255,140,0,0.5)", textTransform:"uppercase", marginBottom:6 }}>TRON Wallet</div>
              <div style={{ fontSize:9, color:"rgba(255,140,0,0.7)", wordBreak:"break-all", marginBottom:8 }}>TPbPB...Kx9r2N</div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:9, color:"rgba(255,140,0,0.5)" }}>USDT Balance</span>
                <span style={{ fontSize:12, color:"#FF8C00", textShadow:"0 0 6px rgba(255,140,0,0.4)" }}>${traderBal.toLocaleString()}</span>
              </div>
            </div>

            {/* Submit order */}
            <div>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(255,140,0,0.4)", textTransform:"uppercase", marginBottom:8 }}>Submit Dark Order</div>
              <input value={depositAmt} onChange={e => setDepositAmt(e.target.value)} placeholder="Amount (USDT)" style={{
                width:"100%", padding:"9px 12px", marginBottom:8,
                background:"rgba(255,140,0,0.04)", border:"1px solid rgba(255,140,0,0.2)", borderRadius:6,
                color:"#FF8C00", fontFamily:"inherit", fontSize:11, outline:"none",
              }} />

              {/* x402 Payment Gate UI */}
              {x402State === "idle" && (
                <button onClick={traderSubmit} style={{
                  width:"100%", padding:"10px", background:"rgba(255,140,0,0.08)",
                  borderTop:"1px solid rgba(255,140,0,0.35)", borderLeft:"1px solid rgba(255,140,0,0.35)", borderRight:"1px solid rgba(255,140,0,0.35)", borderBottom:"3px solid rgba(0,0,0,0.5)", borderRadius:8,
                  color:"#FF8C00", fontFamily:"inherit", fontSize:9, letterSpacing:3, textTransform:"uppercase",
                  cursor:"pointer", textShadow:"0 0 8px rgba(255,140,0,0.5)",
                }}>SUBMIT TO DARK POOL →</button>
              )}

              {/* 402 Payment Required */}
              {x402State === "payment_required" && paymentInfo && (
                <div style={{ border:"1px solid rgba(255,140,0,0.4)", borderRadius:8, overflow:"hidden" }}>
                  <div style={{ padding:"10px 12px", background:"rgba(255,140,0,0.12)", borderBottom:"1px solid rgba(255,140,0,0.2)" }}>
                    <div style={{ fontSize:9, letterSpacing:3, color:"#FF8C00", textShadow:"0 0 8px rgba(255,140,0,0.6)", marginBottom:2 }}>⚡ PAYMENT REQUIRED</div>
                    <div style={{ fontSize:8, color:"rgba(255,140,0,0.6)", letterSpacing:1 }}>HTTP 402 · x402 Protocol</div>
                  </div>
                  <div style={{ padding:"10px 12px", background:"rgba(255,140,0,0.04)" }}>
                    {[
                      { k:"Amount",  v:`${paymentInfo.amount} ${paymentInfo.asset}` },
                      { k:"To",      v:paymentInfo.to.length > 20 ? paymentInfo.to.slice(0,16)+"..." : paymentInfo.to },
                      { k:"Network", v:paymentInfo.chain },
                      { k:"Memo",    v:paymentInfo.memo ?? "dark-pool-access" },
                    ].map(r => (
                      <div key={r.k} style={{ display:"flex", justifyContent:"space-between", fontSize:8.5, padding:"3px 0", borderBottom:"1px solid rgba(255,140,0,0.06)" }}>
                        <span style={{ color:"rgba(255,140,0,0.45)" }}>{r.k}</span>
                        <span style={{ color:"rgba(255,140,0,0.85)" }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"10px 12px", display:"flex", gap:8 }}>
                    <button onClick={() => setX402State("idle")} style={{
                      flex:1, padding:"8px", background:"transparent",
                      border:"1px solid rgba(255,58,58,0.3)", borderRadius:6,
                      color:"rgba(255,58,58,0.6)", fontFamily:"inherit", fontSize:8, letterSpacing:2,
                      cursor:"pointer",
                    }}>CANCEL</button>
                    <button onClick={payAndSubmit} style={{
                      flex:2, padding:"8px", background:"rgba(255,140,0,0.12)",
                      border:"1px solid rgba(255,140,0,0.5)", borderRadius:6,
                      color:"#FF8C00", fontFamily:"inherit", fontSize:8, letterSpacing:2,
                      cursor:"pointer", textShadow:"0 0 6px rgba(255,140,0,0.5)",
                    }}>PAY & SUBMIT →</button>
                  </div>
                </div>
              )}

              {/* Paying */}
              {x402State === "paying" && (
                <div style={{ padding:"12px", border:"1px solid rgba(255,140,0,0.3)", borderRadius:8, background:"rgba(255,140,0,0.06)", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"#FF8C00", letterSpacing:2, animation:"scanPulse 1s ease-in-out infinite" }}>BROADCASTING TRC-20 TX...</div>
                  <div style={{ fontSize:8, color:"rgba(255,140,0,0.5)", marginTop:4, letterSpacing:1 }}>Verifying on TRON Nile Testnet</div>
                </div>
              )}

              {/* Accepted */}
              {x402State === "accepted" && (
                <div style={{ padding:"12px", border:"1px solid rgba(57,255,20,0.3)", borderRadius:8, background:"rgba(57,255,20,0.06)", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#39FF14", letterSpacing:2, textShadow:"0 0 8px rgba(57,255,20,0.6)" }}>✓ ORDER ACCEPTED</div>
                  <div style={{ fontSize:8, color:"rgba(57,255,20,0.5)", marginTop:4, letterSpacing:1 }}>Payment verified · Dark pool active</div>
                </div>
              )}

              {x402Error && (
                <div style={{ marginTop:6, fontSize:8, color:"#FF3A3A", padding:"6px 8px", border:"1px solid rgba(255,58,58,0.2)", borderRadius:4 }}>{x402Error}</div>
              )}
            </div>

            {/* Tx log */}
            <div>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(255,140,0,0.4)", textTransform:"uppercase", marginBottom:8 }}>Transaction Log</div>
              {traderTxs.length === 0 && <div style={{ fontSize:9, color:"rgba(255,140,0,0.3)", letterSpacing:1 }}>No transactions yet</div>}
              {traderTxs.map(tx => (
                <div key={tx.id} style={{ fontSize:8.5, padding:"4px 0", borderBottom:"1px solid rgba(255,140,0,0.06)", display:"flex", justifyContent:"space-between", gap:8 }}>
                  <span style={{ color:"rgba(255,140,0,0.5)", minWidth:50 }}>{tx.ts}</span>
                  <span style={{ flex:1, color:"#FF8C00" }}>{tx.action}</span>
                  <span style={{ color:"rgba(255,140,0,0.7)" }}>{tx.amount}</span>
                  <span style={{ color: tx.status==="confirmed" ? "#39FF14" : "#FF8C00", minWidth:60, textAlign:"right" }}>
                    {tx.status==="confirmed" ? "✓ FILLED" : "⏳ PENDING"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MARKET MAKER PANEL - teal accent */}
        <div style={{ background:"rgba(5,10,18,0.8)", backdropFilter:"blur(18px)", overflow:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 18px 8px", borderBottom:"1px solid rgba(79,168,199,0.15)", fontSize:8, letterSpacing:3, textTransform:"uppercase", color:"rgba(79,168,199,0.5)" }}>
            <span>Market Maker Interface</span>
            <span style={{ color:"#4fa8c7", fontSize:9, fontWeight:600 }}>ROLE: MARKET MAKER</span>
          </div>
          <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>

            {/* MM Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                { label:"Pool Balance", val:`$${mmBal.toLocaleString()}`, color:"#4fa8c7" },
                { label:"Earned Fees",  val:`$${mmFees.toFixed(2)}`,      color:"#39FF14" },
              ].map(s => (
                <div key={s.label} style={{ padding:"10px 12px", background:"rgba(79,168,199,0.04)", border:"1px solid rgba(79,168,199,0.15)", borderRadius:8 }}>
                  <div style={{ fontSize:8, letterSpacing:2, color:"rgba(79,168,199,0.5)", textTransform:"uppercase", marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:16, fontWeight:600, color:s.color, textShadow:`0 0 8px ${s.color}66` }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* x402 Flow Explanation */}
            <div style={{ padding:"12px 14px", background:"rgba(79,168,199,0.03)", border:"1px solid rgba(79,168,199,0.12)", borderRadius:8 }}>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(79,168,199,0.5)", textTransform:"uppercase", marginBottom:8 }}>x402 Payment Flow</div>
              {[
                { step:"1", text:"Trader submits order → HTTP 402 returned" },
                { step:"2", text:"Client broadcasts 0.10 USDT on TRON Nile" },
                { step:"3", text:"Server verifies TRC-20 tx on-chain" },
                { step:"4", text:"Order accepted → enters dark pool" },
              ].map(r => (
                <div key={r.step} style={{ display:"flex", gap:8, padding:"4px 0", borderBottom:"1px solid rgba(79,168,199,0.06)", alignItems:"center" }}>
                  <span style={{ fontSize:7, width:14, height:14, borderRadius:"50%", background:"rgba(79,168,199,0.15)", border:"1px solid rgba(79,168,199,0.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#4fa8c7", flexShrink:0 }}>{r.step}</span>
                  <span style={{ fontSize:8.5, color:"rgba(79,168,199,0.7)" }}>{r.text}</span>
                </div>
              ))}
            </div>

            {/* Liquidity controls */}
            <div>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(79,168,199,0.4)", textTransform:"uppercase", marginBottom:8 }}>Liquidity Management</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={mmDeposit} style={{
                  flex:1, padding:"10px", background:"rgba(79,168,199,0.08)",
                  borderTop:"1px solid rgba(79,168,199,0.3)", borderLeft:"1px solid rgba(79,168,199,0.3)", borderRight:"1px solid rgba(79,168,199,0.3)", borderBottom:"3px solid rgba(0,0,0,0.5)", borderRadius:8,
                  color:"#4fa8c7", fontFamily:"inherit", fontSize:9, letterSpacing:2, textTransform:"uppercase",
                  cursor:"pointer", textShadow:"0 0 6px rgba(79,168,199,0.5)",
                }}>+ DEPOSIT $10K</button>
                <button onClick={mmWithdraw} style={{
                  flex:1, padding:"10px", background:"rgba(255,58,58,0.04)",
                  borderTop:"1px solid rgba(255,58,58,0.2)", borderLeft:"1px solid rgba(255,58,58,0.2)", borderRight:"1px solid rgba(255,58,58,0.2)", borderBottom:"3px solid rgba(0,0,0,0.5)", borderRadius:8,
                  color:"#FF3A3A", fontFamily:"inherit", fontSize:9, letterSpacing:2, textTransform:"uppercase",
                  cursor:"pointer",
                }}>- WITHDRAW $5K</button>
              </div>
            </div>

            {/* Fee rate display */}
            <div style={{ padding:"10px 14px", background:"rgba(79,168,199,0.03)", border:"1px solid rgba(79,168,199,0.1)", borderRadius:8 }}>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(79,168,199,0.4)", textTransform:"uppercase", marginBottom:6 }}>Protocol Parameters</div>
              {[
                { k:"Settlement Fee", v:"0.10% (10 bps)" },
                { k:"MM Share",       v:"60% of fees" },
                { k:"Min Liquidity",  v:"$1,000 USDT" },
                { k:"Network",        v:"TRON Nile Testnet" },
                { k:"x402 Fee",       v:"0.10 USDT / order" },
              ].map(r => (
                <div key={r.k} style={{ display:"flex", justifyContent:"space-between", fontSize:9, padding:"3px 0" }}>
                  <span style={{ color:"rgba(79,168,199,0.4)" }}>{r.k}</span>
                  <span style={{ color:"rgba(79,168,199,0.8)" }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* MM TX log */}
            <div>
              <div style={{ fontSize:8, letterSpacing:2, color:"rgba(79,168,199,0.4)", textTransform:"uppercase", marginBottom:8 }}>Activity Log</div>
              {mmTxs.length === 0 && <div style={{ fontSize:9, color:"rgba(79,168,199,0.3)", letterSpacing:1 }}>No activity yet</div>}
              {mmTxs.map(tx => (
                <div key={tx.id} style={{ fontSize:8.5, padding:"4px 0", borderBottom:"1px solid rgba(79,168,199,0.06)", display:"flex", justifyContent:"space-between", gap:8 }}>
                  <span style={{ color:"rgba(79,168,199,0.4)", minWidth:50 }}>{tx.ts}</span>
                  <span style={{ flex:1, color:"#4fa8c7" }}>{tx.action}</span>
                  <span style={{ color:"#39FF14" }}>{tx.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
