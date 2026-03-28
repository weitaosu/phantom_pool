"use client";
import { useEffect, useState } from "react";

interface Ticker { sym: string; price: number; change: number; alert?: boolean; }

const INIT: Ticker[] = [
  { sym:"BTC",  price:66425, change:-3.52 },
  { sym:"ETH",  price:2004.69, change:-3.06 },
  { sym:"SOL",  price:83.34, change:-3.15 },
  { sym:"ARB",  price:0.0895, change:-5.08 },
  { sym:"AVAX", price:8.80,  change:-3.07 },
];

function fmt(n: number): string {
  return n > 100 ? Math.round(n).toLocaleString() : n.toFixed(3);
}

export default function MarketTicker() {
  const [tickers, setTickers] = useState(INIT);

  useEffect(() => {
    const id = setInterval(() => {
      setTickers(prev => prev.map(t => ({
        ...t,
        price: t.price * (1 + (Math.random() - 0.5) * 0.0003),
      })));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {tickers.map(t => (
        <div key={t.sym} style={{
          display: "grid", gridTemplateColumns: "40px 1fr 68px 44px", gap: 4,
          fontSize: 10, padding: "4px 0", borderBottom: "1px solid rgba(0,220,255,0.05)",
          alignItems: "center",
        }}>
          <span style={{ color: "#FF8C00", fontWeight: 600 }}>{t.sym}</span>
          <span>
            {t.alert && (
              <span style={{
                fontSize: 7, letterSpacing: 1, padding: "1px 4px",
                background: "#FF3A3A", color: "#fff",
                animation: "flash 1.8s ease-in-out infinite",
              }}>⚠</span>
            )}
          </span>
          <span style={{ color: "#c8d8f0", textAlign: "right" }}>{fmt(t.price)}</span>
          <span style={{ color: t.change >= 0 ? "#39FF14" : "#FF3A3A", textAlign: "right", fontSize: 9 }}>
            {t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
