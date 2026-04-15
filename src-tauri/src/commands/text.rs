use tauri::State;

use crate::error::{AppError, AppResult};
use crate::pdf::document::load_document;
use crate::pdf::text_extraction::{self, PageText, SearchMatch};
use crate::state::AppState;

#[tauri::command]
pub fn extract_text(
    doc_id: String,
    page_num: u32,
    state: State<'_, AppState>,
) -> AppResult<PageText> {
    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;
    text_extraction::extract_page_text(&doc, page_num as i32)
}

/// Maximum query length to prevent unbounded O(N*M) search processing.
const MAX_QUERY_LEN: usize = 500;
/// Maximum matches returned to prevent DOM flooding on the frontend.
const MAX_SEARCH_RESULTS: usize = 5000;

#[tauri::command]
pub fn search_text(
    doc_id: String,
    query: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<SearchMatch>> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    if trimmed.len() > MAX_QUERY_LEN {
        return Err(AppError::Pdf(format!(
            "Search query exceeds maximum length of {} characters",
            MAX_QUERY_LEN
        )));
    }

    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;
    let page_count = doc.page_count().map_err(|e| AppError::Pdf(e.to_string()))?;
    let mut results = text_extraction::search_document(&doc, trimmed, page_count)?;
    results.truncate(MAX_SEARCH_RESULTS);
    Ok(results)
}
