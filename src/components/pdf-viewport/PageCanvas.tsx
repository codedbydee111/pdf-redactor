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
  const [cssDims, setCssDims] = useState({ width: 0, height: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const page = await pdfDoc.getPage(pageNum + 1);
      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      setPdfDims({ width: base.width, height: base.height });

      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const bw = Math.round(viewport.width);
      const bh = Math.round(viewport.height);
      canvas.width = bw;
      canvas.height = bh;
      setCssDims({ width: bw / dpr, height: bh / dpr });

      if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; }

      const task = page.render({ canvas, viewport });
      taskRef.current = task;

      try { await task.promise; } catch { /* cancelled */ }
    }

    render();
    return () => { cancelled = true; if (taskRef.current) { taskRef.current.cancel(); taskRef.current = null; } };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: cssDims.width, height: cssDims.height }}
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
