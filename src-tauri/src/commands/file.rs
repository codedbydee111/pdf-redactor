use std::path::Path;

use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::pdf::document;
use crate::state::{AppState, DocumentMeta};

#[derive(Debug, Serialize)]
pub struct OpenPdfResponse {
    pub doc_id: String,
    pub page_count: u32,
    pub path: String,
}

#[tauri::command]
pub fn open_pdf(path: String, state: State<'_, AppState>) -> AppResult<OpenPdfResponse> {
    // Validate the file has a .pdf extension before handing to MuPDF
    match Path::new(&path).extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => {}
        _ => return Err(AppError::Pdf("File must have a .pdf extension".to_string())),
    }

    let page_count = document::page_count(&path)?;
    let doc_id = state.next_document_id();

    let response = OpenPdfResponse {
        doc_id: doc_id.clone(),
        page_count,
        path: path.clone(),
    };

    let mut docs = state.documents.lock().unwrap();
    docs.insert(
        doc_id,
        DocumentMeta { path },
    );

    Ok(response)
}

#[tauri::command]
pub fn close_pdf(doc_id: String, state: State<'_, AppState>) -> AppResult<()> {
    let mut docs = state.documents.lock().unwrap();
    docs.remove(&doc_id);
    Ok(())
}
