export interface OpenPdfResponse {
  doc_id: string;
  page_count: number;
  path: string;
}

export interface PageDimensions {
  width: number;
  height: number;
}

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageText {
  page_num: number;
  blocks: TextBlock[];
  full_text: string;
}

export interface RedactionRegion {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: "manual" | "search" | "selection";
}

export interface MatchRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SearchMatch {
  page: number;
  match_text: string;
  context_before: string;
  context_after: string;
  rects: MatchRect[];
}

export interface ApplyRedactionsResponse {
  pages_affected: number;
  regions_applied: number;
  output_path: string;
}

export interface VerificationResult {
  passed: boolean;
  pages_checked: number;
  leaked_strings: { page: number; text: string }[];
}

export type Tool = "select" | "redact";
