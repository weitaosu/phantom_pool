"use client";
import { useState, useEffect, useRef } from "react";

type Shape = "circle" | "diamond";
type Particle = { id: number; left: number; size: number; color: string; dur: number; shape: Shape; };

const PALETTE = [
  "#39FF14", "#39FF14", "#39FF14",
  "#00DCFF", "#00DCFF",
  "#FF8C00",
];

let _id = 0;
function makeParticle(): Particle {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    id: _id++,
    left: 8 + Math.random() * 82,
    size: 3 + Math.random() * 5,
    color,
    dur: 1.6 + Math.random() * 1.8,
    shape: Math.random() < 0.35 ? "diamond" : "circle",
  };
}

interface IcebergSceneProps {
  total?: number;
  visible?: number;
  matched?: number;
  slippage?: string;
}

export default function IcebergScene({ total = 2400000, visible = 50000, matched = 1750000, slippage = "0.003" }: IcebergSceneProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function spawn() {
    const p = makeParticle();
    setParticles(prev => [...prev, p].slice(-14));
    const t = setTimeout(() => setParticles(prev => prev.filter(x => x.id !== p.id)), p.dur * 1000 + 300);
    timers.current.push(t);
  }

  useEffect(() => {
    // initial burst
    for (let i = 0; i < 5; i++) {
      const t = setTimeout(spawn, i * 130);
      timers.current.push(t);
    }
    // ongoing stream
    let interval: ReturnType<typeof setInterval>;
    function scheduleNext() {
      interval = setInterval(() => {
        spawn();
        clearInterval(interval);
        scheduleNext();
      }, 380 + Math.random() * 270);
    }
    scheduleNext();
    return () => {
      clearInterval(interval);
      timers.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{
        position: "relative", height: 130, borderRadius: 8,
        background: "linear-gradient(to bottom, rgba(0,220,255,0.02), rgba(0,10,30,0.5))",
        border: "1px solid rgba(0,220,255,0.08)",
        overflow: "visible",
      }}>
        {/* Clip mask */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 8, pointerEvents: "none" }}>
          {/* Ghost */}
          <div style={{
            position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: 150, height: 95,
            background: "linear-gradient(to bottom, transparent, rgba(0,220,255,0.08))",
            clipPath: "polygon(18% 0%,82% 0%,100% 100%,0% 100%)",
          }} />
          {/* Tip */}
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            width: 50, height: 38,
            background: "rgba(0,220,255,0.14)",
            clipPath: "polygon(8% 100%,92% 100%,50% 0%)",
            animation: "bergBreathe 3.5s ease-in-out infinite",
          }} />
        </div>

        {/* Waterline */}
        <div style={{ position: "absolute", top: "52%", width: "100%", zIndex: 2, pointerEvents: "none" }}>
          <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.45)", position: "absolute", right: 10, top: -14 }}>ON-CHAIN</div>
          <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,220,255,0.6), transparent)", boxShadow: "0 0 10px rgba(0,220,255,0.5)" }} />
          <div style={{ fontSize: 7, letterSpacing: 2, color: "rgba(0,220,255,0.25)", position: "absolute", left: 10, top: 6 }}>OFF-CHAIN ▼</div>
        </div>

        {/* Particle stream */}
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "52%",
            zIndex: 4,
            pointerEvents: "none",
            animation: `pdotCross ${p.dur}s ease-out forwards`,
          }}>
            <div style={{
              width: p.size,
              height: p.size,
              borderRadius: p.shape === "circle" ? "50%" : 2,
              background: p.color,
              boxShadow: `0 0 ${p.size + 3}px ${p.color}, 0 0 ${Math.round(p.size * 2 + 4)}px ${p.color}66`,
              animation: p.shape === "diamond" ? `pdotSpin ${(p.dur * 0.8).toFixed(2)}s linear infinite` : "none",
            }} />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
        <div>
          <StatRow label="Total"   value={`${(total / 1000000).toFixed(1)}M USDC`} />
          <StatRow label="Visible" value={`${(visible / 1000).toFixed(0)}K USDC`} />
        </div>
        <div>
          <StatRow label="Matched"   value={`${(matched / 1000000).toFixed(2)}M`} green />
          <StatRow label="Slippage"  value={`${slippage}%`} green />
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "5px 0", borderBottom: "1px solid rgba(0,220,255,0.05)" }}>
      <span style={{ color: "rgba(0,220,255,0.4)", fontSize: 9 }}>{label}</span>
      <span className={green ? "glow-green" : "glow-cyan"} style={{ fontSize: 10 }}>{value}</span>
    </div>
  );
}
