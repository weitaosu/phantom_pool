"use client";
import { useState, useCallback, useEffect } from "react";
import TerminalShell from "@/components/layout/TerminalShell";
import IcebergScene from "@/components/dashboard/IcebergScene";
import DarkMatchEngine from "@/components/dashboard/DarkMatchEngine";
import SettlementSeq from "@/components/dashboard/SettlementSeq";
import ExecLog, { LogEntry } from "@/components/dashboard/ExecLog";
import OrderDepth from "@/components/dashboard/OrderDepth";
import MarketTicker from "@/components/dashboard/MarketTicker";
import SessionStats from "@/components/dashboard/SessionStats";
import SentimentFeed from "@/components/agent/SentimentFeed";
import KnowledgeGraph from "@/components/agent/KnowledgeGraph";

const SYMS = ["BTC","ETH","SOL","ARB","AVAX"];

function makeEntry(): LogEntry {
  const side = Math.random() > 0.5 ? "BUY" as const : "SELL" as const;
  return {
    id: Date.now().toString(),
    ts: new Date().toISOString().slice(11,19),
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

  const handleMatch = useCallback(() => {
    setMatchTrigger(t => t + 1);
    const entry = makeEntry();
    setNewEntry(entry);
    setFills(f => f + 1);
    setVolume(v => v + Math.floor(Math.random() * 4 + 1));
  }, []);

  const handleInject = useCallback(() => {
    setNewEntry(makeEntry());
    setFills(f => f + 1);
  }, []);

  // Auto-inject log entries every ~6s so the terminal never looks dead
  useEffect(() => {
    const id = setInterval(() => {
      setNewEntry(makeEntry());
    }, 6000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, []);

  const left = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* AI Sentiment header */}
      <div className="panel-label">
        <span>AI Sentiment</span>
        <span style={{ color: "#39FF14", animation: "scanPulse 2s ease-in-out infinite" }}>● SCANNING</span>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "hidden" }}>
        <SentimentFeed />
        {/* Knowledge Graph sub-header */}
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
        <span style={{ color: "#FF8C00" }}>87,442</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1, overflow: "hidden" }}>
        <IcebergScene />
        <DarkMatchEngine onMatch={handleMatch} />
        <SettlementSeq trigger={matchTrigger} />
        {/* Log */}
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
