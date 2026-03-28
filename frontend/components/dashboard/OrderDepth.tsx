"use client";
import { useEffect, useState, useCallback } from "react";
import { getOrderBook } from "@/lib/api";

interface DepthLevel { price: string; size: string; width: number; side: "bid" | "ask"; }

const INIT: DepthLevel[] = [
  { price:"66,480", size:"412K", width:85, side:"bid" },
  { price:"66,450", size:"218K", width:56, side:"bid" },
  { price:"66,400", size:"290K", width:70, side:"ask" },
  { price:"66,350", size:"95K",  width:38, side:"ask" },
];

export default function OrderDepth() {
  const [levels, setLevels] = useState(INIT);
  const [pressure, setPressure] = useState<"HIGH" | "LOW" | null>(null);
  const [orderCounts, setOrderCounts] = useState<{ buy: number; sell: number } | null>(null);

  const fetchDepth = useCallback(async () => {
    const data = await getOrderBook("BTC");
    if (data) {
      setPressure(data.estimatedBuyPressure);
      if (data.buyOrders > 0 || data.sellOrders > 0) {
        setOrderCounts({ buy: data.buyOrders, sell: data.sellOrders });
      }
    }
  }, []);

  useEffect(() => {
    fetchDepth();
    const fetchId = setInterval(fetchDepth, 5000);
    // Always animate widths for visual life
    const animId = setInterval(() => {
      setLevels(prev => prev.map(l => ({
        ...l,
        width: Math.max(10, Math.min(95, l.width + (Math.random() - 0.5) * 6)),
      })));
    }, 1800);
    return () => { clearInterval(fetchId); clearInterval(animId); };
  }, [fetchDepth]);

  const bids = levels.filter(l => l.side === "bid");
  const asks = levels.filter(l => l.side === "ask");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Live pressure indicator */}
      {pressure && (
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, letterSpacing:1, marginBottom:2 }}>
          <span style={{ color:"rgba(0,220,255,0.35)" }}>BUY PRESSURE</span>
          <span style={{
            color: pressure === "HIGH" ? "#39FF14" : "#FF3A3A",
            textShadow: `0 0 6px ${pressure === "HIGH" ? "rgba(57,255,20,0.5)" : "rgba(255,58,58,0.4)"}`,
          }}>{pressure}</span>
        </div>
      )}
      {orderCounts && (
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, letterSpacing:1, marginBottom:2 }}>
          <span style={{ color:"rgba(57,255,20,0.5)" }}>{orderCounts.buy} BIDS</span>
          <span style={{ color:"rgba(255,58,58,0.5)" }}>{orderCounts.sell} ASKS</span>
        </div>
      )}
      {bids.map((l, i) => <DepthRow key={`b${i}`} l={l} />)}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, opacity: 0.5, margin: "1px 0" }}>
        <span style={{ color: "#334", minWidth: 52, textAlign: "right" }}>66,425</span>
        <div style={{ flex: 1, height: 1, background: "#1a2a1a" }} />
        <span style={{ color: "#FF8C00", minWidth: 42, fontSize: 8 }}>LAST</span>
      </div>
      {asks.map((l, i) => <DepthRow key={`a${i}`} l={l} />)}
    </div>
  );
}

function DepthRow({ l }: { l: DepthLevel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9 }}>
      <span style={{ color: l.side === "bid" ? "#39FF14" : "#FF3A3A", minWidth: 52, textAlign: "right" }}>{l.price}</span>
      <div style={{ flex: 1, height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2, transition: "width 0.6s ease",
          width: `${l.width}%`,
          background: l.side === "bid" ? "rgba(57,255,20,0.35)" : "rgba(255,58,58,0.35)",
        }} />
      </div>
      <span style={{ color: "#334", minWidth: 42, fontSize: 8 }}>{l.size}</span>
    </div>
  );
}
