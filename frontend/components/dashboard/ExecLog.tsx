"use client";
import { useEffect, useRef, useState } from "react";

export interface LogEntry {
  id: string;
  ts: string;
  side: "BUY" | "SELL";
  sym: string;
  size: string;
  slippage: string;
  fresh?: boolean;
}

const INIT: LogEntry[] = [
  { id:"1", ts:"14:32:01", side:"BUY",  sym:"BTC", size:"2.40", slippage:"0.002" },
  { id:"2", ts:"14:31:58", side:"SELL", sym:"ETH", size:"18.0", slippage:"0.005" },
  { id:"3", ts:"14:31:44", side:"BUY",  sym:"SOL", size:"140.", slippage:"0.001" },
];

interface ExecLogProps { newEntry?: LogEntry | null; }

export default function ExecLog({ newEntry }: ExecLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>(INIT);
  const prevEntry = useRef<string | null>(null);

  useEffect(() => {
    if (!newEntry || newEntry.id === prevEntry.current) return;
    prevEntry.current = newEntry.id;
    setEntries(prev => [{ ...newEntry, fresh: true }, ...prev].slice(0, 6));
  }, [newEntry]);

  return (
    <div style={{ overflow: "hidden" }}>
      {entries.map((e) => (
        <div key={e.id} style={{
          fontSize: 8.5, padding: "3.5px 0",
          borderBottom: "1px solid rgba(0,220,255,0.04)",
          display: "flex", gap: 7, color: "#334",
          animation: e.fresh ? "freshLine 0.5s ease-out" : undefined,
        }}>
          <span style={{ color: "#223", minWidth: 50 }}>{e.ts}</span>
          <span style={{ color: e.side === "BUY" ? "#39FF14" : "#FF3A3A" }}>{e.side}</span>
          <span style={{ color: "#FF8C00" }}>{e.sym}</span>
          <span>{e.size} · DARK · {e.slippage}%</span>
        </div>
      ))}
    </div>
  );
}
