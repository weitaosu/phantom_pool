"use client";

export interface NewsItem {
  id: string;
  text: string;
  sentiment: "bull" | "bear" | "neut";
}

const DEFAULTS: NewsItem[] = [
  { id:"1", text:"Fed signals rate pause — crypto ETFs rally",    sentiment:"bull" },
  { id:"2", text:"SEC targets stablecoin reserves investigation", sentiment:"bear" },
  { id:"3", text:"BlackRock BTC holdings up 12% this quarter",   sentiment:"bull" },
  { id:"4", text:"DeFi TVL steady at $88B amid uncertainty",      sentiment:"neut" },
  { id:"5", text:"Whale dump: 4,200 ETH moved to exchange",       sentiment:"bear" },
];

const COLORS = {
  bull: { border:"rgba(57,255,20,0.2)",  bg:"rgba(57,255,20,0.1)",  dot:"#39FF14", shadow:"rgba(57,255,20,0.06)" },
  bear: { border:"rgba(255,58,58,0.2)",  bg:"rgba(255,58,58,0.1)",  dot:"#FF3A3A", shadow:"rgba(255,58,58,0.06)" },
  neut: { border:"rgba(123,94,167,0.2)", bg:"rgba(123,94,167,0.1)", dot:"#7b5ea7", shadow:"none" },
};

interface SentimentFeedProps { items?: NewsItem[]; }

export default function SentimentFeed({ items = DEFAULTS }: SentimentFeedProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(item => {
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
