import { useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { loadPdfDocument, type PDFDocumentProxy } from "../lib/pdf-renderer";
import { useAppStore } from "../lib/store";
import { useTauriCommands } from "./useTauriCommands";

export function usePdfDocument() {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setDocument } = useAppStore();
  const commands = useTauriCommands();

  const openFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filePath = await open({
        multiple: false,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });

      if (!filePath) {
        setLoading(false);
        return;
      }

      // Open in Rust backend (MuPDF) for text extraction + redaction
      const response = await commands.openPdf(filePath);

      // Read file bytes and load in PDF.js for rendering
      const bytes = await readFile(filePath);
      const pdf = await loadPdfDocument(bytes.buffer as ArrayBuffer);

      setPdfDoc(pdf);
      setDocument(response.doc_id, filePath, response.page_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [commands, setDocument]);

  return { pdfDoc, loading, error, openFile };
}
