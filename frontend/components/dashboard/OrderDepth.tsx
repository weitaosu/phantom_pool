"use client";
import { useEffect, useState } from "react";

interface DepthLevel { price: string; size: string; width: number; side: "bid" | "ask"; }

const INIT: DepthLevel[] = [
  { price:"87,500", size:"412K", width:85, side:"bid" },
  { price:"87,480", size:"218K", width:56, side:"bid" },
  { price:"87,400", size:"290K", width:70, side:"ask" },
  { price:"87,360", size:"95K",  width:38, side:"ask" },
];

export default function OrderDepth() {
  const [levels, setLevels] = useState(INIT);

  useEffect(() => {
    const id = setInterval(() => {
      setLevels(prev => prev.map(l => ({
        ...l,
        width: Math.max(10, Math.min(95, l.width + (Math.random() - 0.5) * 6)),
      })));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {levels.filter(l => l.side === "bid").map((l, i) => <DepthRow key={i} l={l} />)}
      {/* Spread line */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, opacity: 0.5, margin: "1px 0" }}>
        <span style={{ color: "#334", minWidth: 52, textAlign: "right" }}>87,442</span>
        <div style={{ flex: 1, height: 1, background: "#1a2a1a" }} />
        <span style={{ color: "#FF8C00", minWidth: 42, fontSize: 8 }}>LAST</span>
      </div>
      {levels.filter(l => l.side === "ask").map((l, i) => <DepthRow key={i} l={l} />)}
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
