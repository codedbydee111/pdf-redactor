use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::pdf::document::load_document;
use crate::pdf::metadata_cleaner;
use crate::pdf::redaction_engine::{self, RedactionRegion};
use crate::pdf::verification;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct ApplyRedactionsResponse {
    pub pages_affected: u32,
    pub regions_applied: u32,
    pub output_path: String,
}

#[tauri::command]
pub fn apply_redactions(
    doc_id: String,
    regions: Vec<RedactionRegion>,
    output_path: String,
    clean_metadata: bool,
    state: State<'_, AppState>,
) -> AppResult<ApplyRedactionsResponse> {
    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;

    if clean_metadata {
        metadata_cleaner::clean_metadata(&doc)?;
    }

    let result = redaction_engine::apply_redactions(&doc, &regions, &output_path)?;

    Ok(ApplyRedactionsResponse {
        pages_affected: result.pages_affected,
        regions_applied: result.regions_applied,
        output_path,
    })
}

#[tauri::command]
pub fn verify_redaction(
    doc_id: String,
    redacted_strings: Vec<String>,
    state: State<'_, AppState>,
) -> AppResult<verification::VerificationResult> {
    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;
    verification::verify_redaction(&doc, &redacted_strings)
}
