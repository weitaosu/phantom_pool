"use client";
import { useState, useEffect } from "react";

export interface NewsItem {
  id: string;
  text: string;
  sentiment: "bull" | "bear" | "neut";
}

const POOL: NewsItem[] = [
  { id:"p1",  text:"Oil breaks $100 on Iran war fears — BUY_YES oil>$95 Q2 · edge +18%",             sentiment:"bear" },
  { id:"p2",  text:"Nasdaq enters correction — BUY_NO S&P500 above 5800 by Apr · edge +14%",         sentiment:"bear" },
  { id:"p3",  text:"Trump extends Iran talks deadline — BUY_NO Iran deal by June · edge +11%",        sentiment:"bear" },
  { id:"p4",  text:"Meta mandates AI tools across all eng teams — AI sector outperform · BUY_YES",    sentiment:"bull" },
  { id:"p5",  text:"X boycott lawsuit dismissed — Musk legal overhang cleared · BUY_YES TSLA Q2",    sentiment:"bull" },
  { id:"p6",  text:"Trump names 12 tech chiefs to PCAST — policy direction mixed · HOLD",             sentiment:"neut" },
  { id:"p7",  text:"Asian equities selloff day 2 — BUY_YES VIX>30 this week · edge +9%",             sentiment:"bear" },
  { id:"p8",  text:"Gold surges to $3,200 on safe-haven demand — BUY_YES gold>$3500 · edge +12%",    sentiment:"bull" },
  { id:"p9",  text:"BlackRock BTC ETF inflows hit record $420M — BUY_YES BTC $100k Apr · edge +6%",  sentiment:"bull" },
  { id:"p10", text:"SEC delays ETH options decision 60 days — BUY_NO ETH approval Q2 · edge +14%",   sentiment:"bear" },
  { id:"p11", text:"Fed signals rate pause through mid-2026 — BUY_NO rate cut May · edge +15%",       sentiment:"bear" },
  { id:"p12", text:"Solana hits 100k TPS in stress test — BUY_YES SOL above $500 Q3 · edge +12%",    sentiment:"bull" },
  { id:"p13", text:"Russia-Ukraine ceasefire talks resume in Vienna — direction unclear · HOLD",       sentiment:"neut" },
  { id:"p14", text:"SpaceX Starship completes full orbital mission — BUY_YES orbit 2026 · edge +8%",  sentiment:"bull" },
  { id:"p15", text:"US CPI prints 3.1%, above estimate — BUY_NO inflation below 2.5% · edge +16%",   sentiment:"bear" },
  { id:"p16", text:"Dogecoin surges 40% after Musk tweet — momentum unclear · HOLD",                  sentiment:"neut" },
  { id:"p17", text:"Apple confirms Vision Pro 2 at WWDC — BUY_YES launch 2026 · edge +19%",           sentiment:"bull" },
  { id:"p18", text:"TikTok ban upheld by appeals court — BUY_YES ban confirmed · edge +13%",          sentiment:"bear" },
];

const COLORS = {
  bull: { border:"rgba(57,255,20,0.2)",  bg:"rgba(57,255,20,0.1)",  dot:"#39FF14", shadow:"rgba(57,255,20,0.06)" },
  bear: { border:"rgba(255,58,58,0.2)",  bg:"rgba(255,58,58,0.1)",  dot:"#FF3A3A", shadow:"rgba(255,58,58,0.06)" },
  neut: { border:"rgba(123,94,167,0.2)", bg:"rgba(123,94,167,0.1)", dot:"#7b5ea7", shadow:"none" },
};

interface SentimentFeedProps { items?: NewsItem[]; }

export default function SentimentFeed({ items }: SentimentFeedProps) {
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (items && items.length > 0) return; // external items — don't cycle
    const id = setInterval(() => setSeed(s => (s + 1) % POOL.length), 3000);
    return () => clearInterval(id);
  }, [items]);

  const display = items && items.length > 0
    ? items
    : [0,1,2,3,4,5].map(i => POOL[(seed + i) % POOL.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {display.map(item => {
        const c = COLORS[item.sentiment];
        return (
          <div key={item.id} style={{
            padding: "7px 9px", borderRadius: 7, border: `1px solid ${c.border}`,
            fontSize: 9, lineHeight: 1.5, position: "relative", overflow: "hidden",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
            boxShadow: `0 0 10px ${c.shadow}`,
          }}>
            <div style={{ position: "absolute", inset: 0, background: c.bg, opacity: 0.12, borderRadius: 7 }} />
            <span style={{ position: "relative", color: "rgba(200,216,240,0.8)" }}>{item.text}</span>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, boxShadow: `0 0 7px ${c.dot}`, flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}
