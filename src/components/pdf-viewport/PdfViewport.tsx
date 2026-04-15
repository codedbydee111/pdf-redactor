import { useRef, useEffect } from "react";
import type { PDFDocumentProxy } from "../../lib/pdf-renderer";
import { useAppStore } from "../../lib/store";
import { PageCanvas } from "./PageCanvas";

interface PdfViewportProps {
  pdfDoc: PDFDocumentProxy;
}

export function PdfViewport({ pdfDoc }: PdfViewportProps) {
  const { zoom, pageCount, setCurrentPage, scrollRequest, activeTool } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const isRedactMode = activeTool === "redact";
  const lastScrollReqId = useRef<number>(0);

  // Track current page from scroll position.
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

  // Scroll to page when sidebar requests it.
  useEffect(() => {
    if (!scrollRequest || scrollRequest.id === lastScrollReqId.current) return;
    lastScrollReqId.current = scrollRequest.id;
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[scrollRequest.page] as HTMLElement | undefined;
    if (child) {
      child.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [scrollRequest]);

  return (
    <div
      ref={containerRef}
      className="viewport-base"
      style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "40px 56px",
        background: isRedactMode ? "var(--bg-viewport-redact)" : "var(--bg-viewport)",
      }}
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          style={{
            marginBottom: 24, flexShrink: 0,
            borderRadius: "var(--radius-sm)",
            boxShadow: isRedactMode
              ? "var(--page-shadow-redact)"
              : "var(--page-shadow)",
            transition: "box-shadow 300ms ease",
          }}
        >
          <PageCanvas pdfDoc={pdfDoc} pageNum={i} scale={zoom} />
        </div>
      ))}
    </div>
  );
}
