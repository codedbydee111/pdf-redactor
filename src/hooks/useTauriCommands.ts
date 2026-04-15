import { invoke } from "@tauri-apps/api/core";
import type {
  OpenPdfResponse,
  PageDimensions,
  PageText,
  SearchMatch,
  RedactionRegion,
  ApplyRedactionsResponse,
  VerificationResult,
} from "../lib/types";

export function useTauriCommands() {
  return {
    openPdf: (path: string) =>
      invoke<OpenPdfResponse>("open_pdf", { path }),

    closePdf: (docId: string) =>
      invoke<void>("close_pdf", { docId }),

    getPageDimensions: (docId: string, pageNum: number) =>
      invoke<PageDimensions>("get_page_dimensions", { docId, pageNum }),

    extractText: (docId: string, pageNum: number) =>
      invoke<PageText>("extract_text", { docId, pageNum }),

    searchText: (docId: string, query: string) =>
      invoke<SearchMatch[]>("search_text", { docId, query }),

    applyRedactions: (
      docId: string,
      regions: Omit<RedactionRegion, "id" | "source">[],
      outputPath: string,
      cleanMetadata: boolean,
    ) =>
      invoke<ApplyRedactionsResponse>("apply_redactions", {
        docId,
        regions,
        outputPath,
        cleanMetadata,
      }),

    verifyRedaction: (docId: string, redactedStrings: string[]) =>
      invoke<VerificationResult>("verify_redaction", {
        docId,
        redactedStrings,
      }),
  };
}
