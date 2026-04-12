import { useState, useCallback, type MouseEvent } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../../lib/store";

interface AnnotationLayerProps {
  pageNum: number;
  scale: number;
  pdfWidth: number;
  pdfHeight: number;
}

export function AnnotationLayer({ pageNum, scale, pdfWidth, pdfHeight }: AnnotationLayerProps) {
  const { activeTool, redactions, addRedaction, removeRedaction } = useAppStore();
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const pageRedactions = redactions.filter((r) => r.page === pageNum);

  const toPos = useCallback((e: MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / (pdfWidth * scale)) * pdfWidth,
      y: ((e.clientY - rect.top) / (pdfHeight * scale)) * pdfHeight,
    };
  }, [scale, pdfWidth, pdfHeight]);

  const onDown = useCallback((e: MouseEvent) => {
    if (activeTool !== "redact") return;
    e.preventDefault();
    const p = toPos(e);
    setStartPos(p); setCurrentPos(p); setDrawing(true);
  }, [activeTool, toPos]);

  const onMove = useCallback((e: MouseEvent) => {
    if (drawing) setCurrentPos(toPos(e));
  }, [drawing, toPos]);

  const onUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);
    if (w < 3 && h < 3) return;
    addRedaction({ page: pageNum, x, y, width: w, height: h, source: "manual" });
  }, [drawing, startPos, currentPos, pageNum, addRedaction]);

  const d = (v: number) => v * scale;

  const preview = drawing ? {
    left: d(Math.min(startPos.x, currentPos.x)),
    top: d(Math.min(startPos.y, currentPos.y)),
    width: d(Math.abs(currentPos.x - startPos.x)),
    height: d(Math.abs(currentPos.y - startPos.y)),
  } : null;

  return (
    <div
      style={{
        position: "absolute", top: 0, left: 0,
        width: pdfWidth * scale, height: pdfHeight * scale,
        cursor: activeTool === "redact" ? "crosshair" : "default",
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={() => drawing && onUp()}
    >
      {pageRedactions.map((r) => (
        <div
          key={r.id}
          style={{
            position: "absolute",
            left: d(r.x), top: d(r.y), width: d(r.width), height: d(r.height),
            background: "rgba(220,38,38,0.10)",
            border: "1.5px solid rgba(220,38,38,0.45)",
            borderRadius: 2,
            transition: "background 100ms ease, border-color 100ms ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(220,38,38,0.15)";
            e.currentTarget.style.borderColor = "rgba(220,38,38,0.7)";
            const btn = e.currentTarget.querySelector<HTMLElement>("[data-close]");
            if (btn) btn.style.opacity = "1";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(220,38,38,0.10)";
            e.currentTarget.style.borderColor = "rgba(220,38,38,0.45)";
            const btn = e.currentTarget.querySelector<HTMLElement>("[data-close]");
            if (btn) btn.style.opacity = "0";
          }}
        >
          <button
            data-close
            onClick={(e) => { e.stopPropagation(); removeRedaction(r.id); }}
            style={{
              position: "absolute", top: -8, right: -8,
              width: 20, height: 20, opacity: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--radius-sm)",
              background: "var(--gray-950)", color: "#fff",
              boxShadow: "var(--shadow-lg)",
              transition: "opacity 150ms ease",
            }}
          >
            <X size={10} strokeWidth={3} />
          </button>
        </div>
      ))}

      {preview && (
        <div
          style={{
            position: "absolute", pointerEvents: "none",
            ...preview,
            background: "rgba(79,70,229,0.08)",
            border: "1.5px solid rgba(79,70,229,0.5)",
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}
