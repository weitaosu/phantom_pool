"use client";

interface SessionStatsProps { fills: number; volume: number; }

export default function SessionStats({ fills, volume }: SessionStatsProps) {
  return (
    <div>
      <StatRow label="Dark Fills"   value={fills.toLocaleString()} green />
      <StatRow label="Avg Slippage" value="0.0024%"                green />
      <StatRow label="Volume"       value={`$${volume}M`} />
      <StatRow label="Rejected"     value="3"             red />
    </div>
  );
}

function StatRow({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  const color = green ? "#39FF14" : red ? "#FF3A3A" : "#00DCFF";
  const shadow = green ? "rgba(57,255,20,0.5)" : red ? "rgba(255,58,58,0.4)" : "rgba(0,220,255,0.5)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "5px 0", borderBottom: "1px solid rgba(0,220,255,0.05)" }}>
      <span style={{ color: "rgba(0,220,255,0.4)", fontSize: 9 }}>{label}</span>
      <span style={{ color, textShadow: `0 0 6px ${shadow}` }}>{value}</span>
    </div>
  );
}
