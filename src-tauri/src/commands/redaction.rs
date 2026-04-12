use std::path::Path;

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
    // Validate output path — must be absolute and end with .pdf
    let out = Path::new(&output_path);
    if !out.is_absolute() {
        return Err(AppError::Pdf("Output path must be absolute".to_string()));
    }
    match out.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => {}
        _ => return Err(AppError::Pdf("Output path must be a .pdf file".to_string())),
    }
    // Prevent writing to system directories
    let out_str = output_path.as_str();
    let blocked_prefixes: &[&str] = if cfg!(target_os = "windows") {
        &["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
    } else {
        &["/System", "/usr", "/bin", "/sbin", "/etc", "/var", "/private/var"]
    };
    for prefix in blocked_prefixes {
        if out_str.starts_with(prefix) {
            return Err(AppError::Pdf("Cannot write to system directories".to_string()));
        }
    }

    // Validate redaction regions
    for (i, region) in regions.iter().enumerate() {
        if region.width <= 0.0 || region.height <= 0.0 {
            return Err(AppError::Pdf(format!(
                "Redaction region {} has invalid dimensions ({}x{})",
                i, region.width, region.height
            )));
        }
        if region.x < 0.0 || region.y < 0.0 {
            return Err(AppError::Pdf(format!(
                "Redaction region {} has negative coordinates ({}, {})",
                i, region.x, region.y
            )));
        }
    }

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
