import { useState } from "react";
import {
  MousePointer2, SquareDashedMousePointer, Undo2, Redo2, Download, FolderOpen, Minus, Plus,
} from "lucide-react";
import { useAppStore } from "../../lib/store";

interface ToolbarProps {
  onOpen: () => void;
  onExport: () => void;
  loading: boolean;
  dark?: boolean;
}

export function Toolbar({ onOpen, onExport, loading, dark }: ToolbarProps) {
  const {
    activeTool, setActiveTool, zoom, setZoom,
    redactions, undo, redo, undoStack, redoStack,
    currentPage, pageCount, filePath,
  } = useAppStore();

  const fileName = filePath?.split("/").pop()?.replace(/\.pdf$/i, "") ?? "";

  if (dark) {
    return (
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 48, flexShrink: 0, userSelect: "none",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={onOpen}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            height: 32, padding: "0 16px", borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: "rgba(255,255,255,0.5)", transition: "all 200ms",
            opacity: loading ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "rgba(255,255,255,0.9)";
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <FolderOpen size={14} strokeWidth={1.7} />
          {loading ? "Opening..." : "Open PDF"}
        </button>
      </header>
    );
  }

  const hasRedactions = redactions.length > 0;

  return (
    <header style={{
      display: "flex", alignItems: "center",
      height: 48, flexShrink: 0, userSelect: "none",
      padding: "0 20px",
      background: "#fff", borderBottom: "1px solid var(--gray-200)",
    }}>
      {/* ── Left: File + Tools ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onOpen} disabled={loading} className="icon-btn" title="Open PDF (⌘O)">
          <FolderOpen size={15} strokeWidth={1.7} />
        </button>

        {fileName && (
          <span style={{
            fontSize: 12, fontWeight: 500, color: "var(--gray-500)",
            maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {fileName}
          </span>
        )}

        <Sep />

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <ToolButton
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
            label="Select"
            shortcut="V"
          >
            <MousePointer2 size={14} strokeWidth={1.8} />
          </ToolButton>
          <ToolButton
            active={activeTool === "redact"}
            onClick={() => setActiveTool("redact")}
            label="Redact"
            shortcut="R"
            variant="brand"
          >
            <SquareDashedMousePointer size={14} strokeWidth={1.8} />
          </ToolButton>
        </div>
      </div>

      {/* ── Center: Page indicator ── */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", color: "var(--gray-400)" }}>
          Page{" "}
          <span style={{ color: "var(--gray-700)", fontVariantNumeric: "tabular-nums" }}>{currentPage + 1}</span>
          {" / "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{pageCount}</span>
        </span>
      </div>

      {/* ── Right: Undo/Redo + Zoom + Export ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={undo} disabled={undoStack.length === 0} className="icon-btn" title="Undo (⌘Z)">
            <Undo2 size={14} strokeWidth={1.7} />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="icon-btn" title="Redo (⌘⇧Z)">
            <Redo2 size={14} strokeWidth={1.7} />
          </button>
        </div>

        <Sep />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.25} className="icon-btn" title="Zoom out">
            <Minus size={13} strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Reset zoom"
            style={{
              fontSize: 11, fontWeight: 600, padding: "0 8px",
              color: "var(--gray-500)", fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 4} className="icon-btn" title="Zoom in">
            <Plus size={13} strokeWidth={1.8} />
          </button>
        </div>

        <Sep />

        <button
          onClick={onExport}
          disabled={!hasRedactions}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 36, padding: "0 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap",
            background: "var(--brand-600)",
            opacity: hasRedactions ? 1 : 0.25,
            transition: "all 100ms",
          }}
          onMouseEnter={e => { if (hasRedactions) e.currentTarget.style.background = "var(--brand-500)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--brand-600)"; }}
        >
          <Download size={13} strokeWidth={2} />
          Export{hasRedactions ? ` (${redactions.length})` : ""}
        </button>
      </div>
    </header>
  );
}

function ToolButton({
  active, onClick, label, shortcut, variant, children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  shortcut: string;
  variant?: "brand";
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  const activeColor = variant === "brand" ? "var(--brand-600)" : "var(--gray-100)";
  const activeFg = variant === "brand" ? "#fff" : "var(--gray-800)";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="icon-btn"
        style={{
          color: active ? activeFg : undefined,
          background: active ? activeColor : undefined,
        }}
      >
        {children}
      </button>

      {hovered && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
          marginTop: 8, padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap",
          background: "var(--gray-950)", color: "#fff",
          fontSize: 11, fontWeight: 500, lineHeight: 1,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 50, pointerEvents: "none",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {label}
          <span style={{
            fontSize: 10, fontWeight: 600, opacity: 0.5,
            padding: "1px 4px", borderRadius: 3,
            background: "rgba(255,255,255,0.1)",
          }}>
            {shortcut}
          </span>
        </div>
      )}
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 16, flexShrink: 0, background: "var(--gray-200)" }} />;
}
