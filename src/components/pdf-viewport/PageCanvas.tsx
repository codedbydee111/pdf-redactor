import { useRef, useEffect, useState } from "react";
import type { PDFDocumentProxy } from "../../lib/pdf-renderer";
import { AnnotationLayer } from "./AnnotationLayer";

interface PageCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageNum: number;
  scale: number;
}

export function PageCanvas({ pdfDoc, pageNum, scale }: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDims, setPdfDims] = useState({ width: 0, height: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRef = useRef<any>(null);

  // CSS dimensions update synchronously from state — zoom feels instant.
  // The canvas bitmap is stretched/squeezed until the re-render lands.
  const cssWidth = pdfDims.width * scale;
  const cssHeight = pdfDims.height * scale;

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const page = await pdfDoc.getPage(pageNum + 1);
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      setPdfDims({ width: base.width, height: base.height });

      const viewport = page.getViewport({ scale: scale * dpr });
      const bw = Math.round(viewport.width);
      const bh = Math.round(viewport.height);

      // Render to an offscreen canvas so the visible one isn't blanked.
      const offscreen = document.createElement("canvas");
      offscreen.width = bw;
      offscreen.height = bh;

      if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; }

      const task = page.render({ canvas: offscreen, viewport });
      taskRef.current = task;

      try {
        await task.promise;
        if (cancelled) return;
        // Swap the finished bitmap onto the visible canvas in one
        // synchronous
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = bw;
          canvas.height = bh;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(offscreen, 0, 0);
        }
      } catch { /* cancelled */ }
    }

    render();
    return () => { cancelled = true; if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; } };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: cssWidth, height: cssHeight }}
      />
      <AnnotationLayer
        pageNum={pageNum}
        scale={scale}
        pdfWidth={pdfDims.width}
        pdfHeight={pdfDims.height}
      />
    </div>
  );
}
