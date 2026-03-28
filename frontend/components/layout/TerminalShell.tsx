"use client";
import { ReactNode } from "react";
import TopBar from "./TopBar";

interface TerminalShellProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  onMatch?: () => void;
  onInject?: () => void;
}

export default function TerminalShell({ left, center, right, onMatch, onInject }: TerminalShellProps) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "42px 1fr", height: "100vh", position: "relative", zIndex: 1 }}>
      <TopBar onMatch={onMatch} onInject={onInject} />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 260px", height: "100%", overflow: "hidden" }}>
        {/* Left panel */}
        <div style={{ borderRight: "1px solid rgba(0,220,255,0.10)", background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {left}
        </div>
        {/* Center - transparent */}
        <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {center}
        </div>
        {/* Right panel */}
        <div style={{ borderLeft: "1px solid rgba(0,220,255,0.10)", background: "rgba(5,12,28,0.72)", backdropFilter: "blur(18px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {right}
        </div>
      </div>
    </div>
  );
}
