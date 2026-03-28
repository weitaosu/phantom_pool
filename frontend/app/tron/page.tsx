"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";

type TxEntry = { id:string; action:string; amount:string; ts:string; status:"pending"|"confirmed"; };

export default function TronPage() {
  const [traderBal,   setTraderBal]   = useState(5000);
  const [mmBal,       setMmBal]       = useState(50000);
  const [mmFees,      setMmFees]      = useState(12.4);
  const [depositAmt,  setDepositAmt]  = useState("1000");
  const [traderTxs,   setTraderTxs]   = useState<TxEntry[]>([]);
  const [mmTxs,       setMmTxs]       = useState<TxEntry[]>([]);

  function traderSubmit() {
    const amt = parseInt(depositAmt) || 0;
    if (amt <= 0) return;
    setTraderBal(b => b - amt);
    setTraderTxs(prev => [{
      id: Date.now().toString(), action:"DARK ORDER SUBMITTED",
      amount: `$${amt}`, ts: new Date().toISOString().slice(11,19),
      status: "pending" as const,
    }, ...prev].slice(0, 5));
    setTimeout(() => setTraderTxs(prev => prev.map((t,i) => i===0 ? {...t, status:"confirmed" as const} : t)), 2400);
    setTimeout(() => setMmFees(f => f + amt * 0.001), 2400);
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
              <button onClick={traderSubmit} style={{
                width:"100%", padding:"10px", background:"rgba(255,140,0,0.08)",
                borderTop:"1px solid rgba(255,140,0,0.35)", borderLeft:"1px solid rgba(255,140,0,0.35)", borderRight:"1px solid rgba(255,140,0,0.35)", borderBottom:"3px solid rgba(0,0,0,0.5)", borderRadius:8,
                color:"#FF8C00", fontFamily:"inherit", fontSize:9, letterSpacing:3, textTransform:"uppercase",
                cursor:"pointer", textShadow:"0 0 8px rgba(255,140,0,0.5)",
              }}>SUBMIT TO DARK POOL →</button>
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
