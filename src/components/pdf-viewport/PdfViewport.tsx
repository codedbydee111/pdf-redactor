import { useRef, useEffect } from "react";
import type { PDFDocumentProxy } from "../../lib/pdf-renderer";
import { useAppStore } from "../../lib/store";
import { PageCanvas } from "./PageCanvas";

interface PdfViewportProps {
  pdfDoc: PDFDocumentProxy;
}

export function PdfViewport({ pdfDoc }: PdfViewportProps) {
  const { zoom, pageCount, setCurrentPage, activeTool } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isRedactMode = activeTool === "redact";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const mid = el.getBoundingClientRect().top + el.clientHeight / 2;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const r = el.children[i].getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      }
      setCurrentPage(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [setCurrentPage]);

  return (
    <div
      ref={containerRef}
      className="viewport-base"
      style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "40px 56px",
        background: isRedactMode ? "#f5f0f0" : "var(--gray-100)",
      }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          style={{
            marginBottom: 24, flexShrink: 0,
            borderRadius: "var(--radius-sm)",
            boxShadow: isRedactMode
              ? "0 1px 6px rgba(15,17,23,0.06), 0 0 0 1px rgba(220,38,38,0.08)"
              : "0 1px 6px rgba(15,17,23,0.06), 0 0 0 1px rgba(15,17,23,0.03)",
            transition: "box-shadow 300ms ease",
          }}
        >
          <PageCanvas pdfDoc={pdfDoc} pageNum={i} scale={zoom} />
        </div>
      ))}
    </div>
  );
}
