import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function loadPdfDocument(data: ArrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  return pdf;
}

export type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
