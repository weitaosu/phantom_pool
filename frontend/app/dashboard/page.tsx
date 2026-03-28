"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import TerminalShell from "@/components/layout/TerminalShell";
import IcebergScene from "@/components/dashboard/IcebergScene";
import DarkMatchEngine from "@/components/dashboard/DarkMatchEngine";
import SettlementSeq from "@/components/dashboard/SettlementSeq";
import ExecLog, { LogEntry } from "@/components/dashboard/ExecLog";
import OrderDepth from "@/components/dashboard/OrderDepth";
import MarketTicker from "@/components/dashboard/MarketTicker";
import SessionStats from "@/components/dashboard/SessionStats";
import SentimentFeed, { NewsItem } from "@/components/agent/SentimentFeed";
import KnowledgeGraph from "@/components/agent/KnowledgeGraph";
import { getNewsSignals, type NewsSignal } from "@/lib/api";
import { useWebSocket, type WsEvent } from "@/lib/useWebSocket";

const SYMS = ["BTC","ETH","SOL","ARB","AVAX"];


function signalToNewsItem(s: NewsSignal): NewsItem {
  return {
    id: s.timestamp.toString(),
    text: `${s.articleTitle}`,
    sentiment: s.action === "BUY_YES" ? "bull" : s.action === "BUY_NO" ? "bear" : "neut",
  };
}

function makeEntryFromMatch(data: Record<string, unknown>): LogEntry {
  const market = (data.market as string) ?? "DARK";
  const sym = SYMS.find(s => market.toUpperCase().includes(s)) ?? "DARK";
  const rawSize = data.matchedSizeUsdc as string | number | undefined;
  const sizeNum = rawSize ? Number(rawSize) / 1e6 : Math.random() * 10 + 0.5;
  return {
    id: Date.now().toString() + Math.random(),
    ts: new Date().toISOString().slice(11, 19),
    side: "BUY",
    sym,
    size: sizeNum.toFixed(2),
    slippage: (Math.random() * 0.006 + 0.001).toFixed(3),
    fresh: true,
  };
}

function makeRandomEntry(): LogEntry {
  const side = Math.random() > 0.5 ? "BUY" as const : "SELL" as const;
  return {
    id: Date.now().toString() + Math.random(),
    ts: new Date().toISOString().slice(11, 19),
    side,
    sym: SYMS[Math.floor(Math.random() * SYMS.length)],
    size: (Math.random() * 10 + 0.5).toFixed(2),
    slippage: (Math.random() * 0.009 + 0.001).toFixed(3),
    fresh: true,
  };
}

export default function DashboardPage() {
  const [matchTrigger, setMatchTrigger] = useState(0);
  const [newEntry, setNewEntry] = useState<LogEntry | null>(null);
  const [fills, setFills] = useState(1247);
  const [volume, setVolume] = useState(847);
  const [sentimentItems, setSentimentItems] = useState<NewsItem[]>([]);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const handleMatch = useCallback(() => {
    setMatchTrigger(t => t + 1);
    const entry = makeRandomEntry();
    setNewEntry(entry);
    setFills(f => f + 1);
    setVolume(v => v + Math.floor(Math.random() * 4 + 1));
  }, []);

  const handleInject = useCallback(() => {
    setNewEntry(makeRandomEntry());
    setFills(f => f + 1);
  }, []);

  // WebSocket: real-time events from backend
  const handleWsEvent = useCallback((event: WsEvent) => {
    switch (event.type) {
      case "order.matched": {
        setMatchTrigger(t => t + 1);
        setNewEntry(makeEntryFromMatch(event.data));
        setFills(f => f + 1);
        setVolume(v => {
          const size = Number((event.data.matchedSizeUsdc as string | undefined) ?? 0) / 1e6;
          return v + Math.max(1, Math.floor(size / 1000));
        });
        break;
      }
      case "order.settled": {
        setFills(f => f + 1);
        break;
      }
      case "iceberg.slice": {
        const sym = SYMS.find(s =>
          String(event.data.orderId ?? "").toUpperCase().includes(s)
        ) ?? "ICE";
        setNewEntry({
          id: Date.now().toString() + Math.random(),
          ts: new Date().toISOString().slice(11, 19),
          side: "BUY",
          sym,
          size: "SLICE",
          slippage: "0.001",
          fresh: true,
        });
        break;
      }
      case "news.signal": {
        const signal = event.data as unknown as NewsSignal;
        setSentimentItems(prev => [signalToNewsItem(signal), ...prev].slice(0, 8));
        break;
      }
      case "arb.detected": {
        setNewEntry({
          id: Date.now().toString() + Math.random(),
          ts: new Date().toISOString().slice(11, 19),
          side: "BUY",
          sym: "ARB",
          size: "XVENUE",
          slippage: String((event.data.spread as number ?? 0).toFixed(3)),
          fresh: true,
        });
        break;
      }
    }
  }, []);

  useWebSocket(handleWsEvent);

  // Auto-inject log entries every ~8s so terminal never looks dead
  useEffect(() => {
    function schedule() {
      autoIntervalRef.current = setInterval(() => {
        setNewEntry(makeRandomEntry());
      }, 8000 + Math.random() * 5000);
    }
    schedule();
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, []);

  const left = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-label">
        <span>AI Sentiment</span>
        <span style={{ color: "#39FF14", animation: "scanPulse 2s ease-in-out infinite" }}>● SCANNING</span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "hidden" }}>
        <SentimentFeed items={sentimentItems} />
        <div className="panel-label" style={{ margin: "0 -14px", padding: "8px 14px", borderTop: "1px solid rgba(0,220,255,0.10)" }}>
          <span>Knowledge Graph</span>
        </div>
        <KnowledgeGraph />
      </div>
    </div>
  );

  const center = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-label">
        <span>Iceberg Engine · BTC/USD</span>
        <span style={{ color: "#FF8C00" }}>66,425</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "hidden" }}>
        <IcebergScene />
        <DarkMatchEngine onMatch={handleMatch} />
        <SettlementSeq trigger={matchTrigger} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="panel-label" style={{ margin: "0 -16px", padding: "6px 14px", borderTop: "1px solid rgba(0,220,255,0.10)", borderBottom: "1px solid rgba(0,220,255,0.10)" }}>
            <span>Execution Log</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <ExecLog newEntry={newEntry} />
          </div>
        </div>
      </div>
    </div>
  );

  const right = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-label"><span>Market Feed</span></div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "hidden" }}>
        <MarketTicker />
        <div className="panel-label" style={{ margin: "4px -14px 0", padding: "8px 14px", borderTop: "1px solid rgba(0,220,255,0.10)" }}>
          <span>Order Depth · BTC</span>
        </div>
        <OrderDepth />
        <div className="panel-label" style={{ margin: "4px -14px 0", padding: "8px 14px", borderTop: "1px solid rgba(0,220,255,0.10)" }}>
          <span>Session Stats</span>
        </div>
        <SessionStats fills={fills} volume={volume} />
      </div>
    </div>
  );

  return <TerminalShell left={left} center={center} right={right} onMatch={handleMatch} onInject={handleInject} />;
}
